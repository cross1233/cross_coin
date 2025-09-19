import { ethers } from 'ethers';

// Base Sepolia 测试网配置（来自all.md文档）
const BASE_SEPOLIA_CONFIG = {
  chainId: 84532,
  rpcUrl: "https://sepolia.base.org",
  domainId: 6,
  contracts: {
    // Circle CCTP 合约地址（修正为正确的Base Sepolia地址）
    tokenMessengerV2: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    messageTransmitterV2: "0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c", 
    tokenMinterV2: "0xfd78EE919681417d192449715b2594ab58f5D002",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
};

// Aptos测试网域ID
const APTOS_DOMAIN_ID = 9;

// TokenMessengerV2 合约 ABI（只包含我们需要的函数）
const TOKEN_MESSENGER_ABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "amount", "type": "uint256"},
      {"internalType": "uint32", "name": "destinationDomain", "type": "uint32"},
      {"internalType": "bytes32", "name": "mintRecipient", "type": "bytes32"},
      {"internalType": "address", "name": "burnToken", "type": "address"}
    ],
    "name": "depositForBurn",
    "outputs": [
      {"internalType": "uint64", "name": "_nonce", "type": "uint64"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// USDC ERC20 合约 ABI（只包含我们需要的函数）
const USDC_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * 将EVM地址转换为Aptos地址格式
 * 根据Circle文档，需要将20字节的EVM地址填充为32字节
 */
function evmToAptosAddress(evmAddress: string): string {
  // 移除0x前缀
  const cleanAddress = evmAddress.replace('0x', '');
  // 左填充0到64个字符（32字节）
  const paddedAddress = '0'.repeat(64 - cleanAddress.length) + cleanAddress;
  return '0x' + paddedAddress;
}

/**
 * 将Aptos地址转换为bytes32格式（用于跨链消息）
 */
function aptosAddressToBytes32(aptosAddress: string): string {
  // 确保是64个字符（32字节）
  const cleanAddress = aptosAddress.replace('0x', '');
  if (cleanAddress.length !== 64) {
    throw new Error('Invalid Aptos address length');
  }
  return '0x' + cleanAddress;
}

export interface CrossChainParams {
  amount: string;              // USDC数量（字符串避免精度问题）
  recipientAddress: string;    // Aptos接收地址
  signer: ethers.Signer;       // 用户的钱包签名器
}

export interface CrossChainResult {
  txHash: string;              // Base链交易哈希
  nonce: string;               // Circle消息nonce
  messageBytes?: string;       // 跨链消息（从事件日志提取）
}

/**
 * Base链CCTP跨链发送器类
 */
export class BaseCCTPSender {
  private provider: ethers.Provider;
  private tokenMessengerContract: ethers.Contract;
  private usdcContract: ethers.Contract;

  constructor() {
    // 初始化Base Sepolia提供者
    this.provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_CONFIG.rpcUrl);

    // 初始化合约实例（只读模式）
    this.tokenMessengerContract = new ethers.Contract(
      BASE_SEPOLIA_CONFIG.contracts.tokenMessengerV2,
      TOKEN_MESSENGER_ABI,
      this.provider
    );

    this.usdcContract = new ethers.Contract(
      BASE_SEPOLIA_CONFIG.contracts.usdc,
      USDC_ABI,
      this.provider
    );
  }

  /**
   * 检查用户USDC余额
   */
  async checkUSDCBalance(userAddress: string): Promise<string> {
    try {
      const balance = await this.usdcContract.balanceOf(userAddress);
      const decimals = await this.usdcContract.decimals();
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error('检查USDC余额失败:', error);
      throw error;
    }
  }

  /**
   * 批准USDC转账（必须在depositForBurn之前调用）
   */
  async approveUSDC(params: {
    amount: string;
    signer: ethers.Signer;
  }): Promise<string> {
    try {
      console.log('正在批准USDC转账...');

      // 连接签名器到USDC合约
      const usdcWithSigner = this.usdcContract.connect(params.signer);

      // 获取USDC精度
      const decimals = await this.usdcContract.decimals();
      const amountWei = ethers.parseUnits(params.amount, decimals);

      // 批准TokenMessenger合约使用用户的USDC
      // 为了避免授权不足，我们授权一个更大的金额
      const maxUint256 = ethers.MaxUint256;
      const approveTx = await (usdcWithSigner as any).approve(
        BASE_SEPOLIA_CONFIG.contracts.tokenMessengerV2,
        maxUint256  // 授权最大金额，避免重复授权
        // 让ethers自动处理nonce
      );

      console.log('批准交易已发送，等待确认...', approveTx.hash);
      await approveTx.wait();
      console.log('USDC批准成功!');

      return approveTx.hash;
    } catch (error) {
      console.error('USDC批准失败:', error);
      throw error;
    }
  }

  /**
   * 执行跨链转账（烧毁Base链USDC，发送到Aptos链）
   */
  async depositForBurn(params: CrossChainParams): Promise<CrossChainResult> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`开始Base到Aptos的CCTP跨链转账... (尝试 ${attempt}/${maxRetries})`);
        console.log('参数:', {
          amount: params.amount,
          recipient: params.recipientAddress,
          sender: await params.signer.getAddress()
        });

        // 验证Aptos地址格式
        if (!params.recipientAddress.startsWith('0x') || params.recipientAddress.length !== 66) {
          throw new Error('无效的Aptos地址格式，应为64个字符的十六进制地址');
        }

        // 连接签名器到TokenMessenger合约
        const contractWithSigner = this.tokenMessengerContract.connect(params.signer);

        // 获取USDC精度并转换金额
        const decimals = await this.usdcContract.decimals();
        const amountWei = ethers.parseUnits(params.amount, decimals);

        // 将Aptos地址转换为bytes32格式
        const mintRecipient = aptosAddressToBytes32(params.recipientAddress);

        console.log('调用depositForBurn，参数:', {
          amount: amountWei.toString(),
          destinationDomain: APTOS_DOMAIN_ID,
          mintRecipient,
          burnToken: BASE_SEPOLIA_CONFIG.contracts.usdc
        });

        // 获取当前nonce确保交易顺序
        const currentNonce = await params.signer.getNonce();
        console.log('当前账户nonce:', currentNonce);

        // 调用depositForBurn函数
        const tx = await (contractWithSigner as any).depositForBurn(
          amountWei,                                    // 要烧毁的USDC数量
          APTOS_DOMAIN_ID,                             // 目标链域ID（Aptos = 9）
          mintRecipient,                               // Aptos接收地址（bytes32格式）
          BASE_SEPOLIA_CONFIG.contracts.usdc           // 要烧毁的代币地址（USDC）
          // 让ethers自动处理nonce
        );

        console.log('跨链交易已发送，等待确认...', tx.hash);

        // 等待交易确认
        const receipt = await tx.wait();
        console.log('跨链交易确认成功!');

        // 从交易回执中提取nonce（这是Circle用来跟踪消息的）
        // TODO: 解析交易日志获取messageBytes
        const nonce = receipt.logs?.[0]?.topics?.[1] || '0';

        return {
          txHash: tx.hash,
          nonce: nonce,
          // messageBytes 需要从事件日志中解析，这里先留空
          messageBytes: undefined
        };

      } catch (error: any) {
        lastError = error;
        console.error(`跨链转账失败 (尝试 ${attempt}/${maxRetries}):`, error.message);

        // 如果是nonce错误且还有重试机会，等待一下再重试
        if (error.code === 'NONCE_EXPIRED' && attempt < maxRetries) {
          console.log('检测到nonce错误，等待2秒后重试...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // 如果不是nonce错误或已达到最大重试次数，直接抛出错误
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }

    throw lastError || new Error('跨链转账失败');
  }

  /**
   * 一键完成：检查余额 -> 批准 -> 跨链转账
   */
  async executeFullCrossChain(params: CrossChainParams): Promise<CrossChainResult> {
    try {
      const userAddress = await params.signer.getAddress();

      // 1. 检查USDC余额
      console.log('1. 检查USDC余额...');
      const balance = await this.checkUSDCBalance(userAddress);
      console.log(`当前USDC余额: ${balance}`);

      if (parseFloat(balance) < parseFloat(params.amount)) {
        throw new Error(`USDC余额不足，当前: ${balance}, 需要: ${params.amount}`);
      }

      // 2. 批准USDC转账
      console.log('2. 批准USDC转账...');
      await this.approveUSDC({
        amount: params.amount,
        signer: params.signer
      });

      // 3. 执行跨链转账
      console.log('3. 执行跨链转账...');
      const result = await this.depositForBurn(params);

      console.log('✅ 跨链转账完成!', result);
      return result;

    } catch (error) {
      console.error('❌ 跨链转账失败:', error);
      throw error;
    }
  }
}

// 导出工具函数
export {
  evmToAptosAddress,
  aptosAddressToBytes32,
  BASE_SEPOLIA_CONFIG,
  APTOS_DOMAIN_ID
};