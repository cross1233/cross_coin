import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  AccountAddress,
  U8,
  MoveVector
} from '@aptos-labs/ts-sdk';

// 导入 USDC CoinStore 注册工具
import { ensureUSDCCoinStore } from './usdc-coinstore-register';

// Aptos测试网配置（来自all.md文档）
const APTOS_TESTNET_CONFIG = {
  network: Network.TESTNET,
  rpcUrl: "https://fullnode.testnet.aptoslabs.com",
  domainId: 9,
  // Circle CCTP官方包和对象地址
  packages: {
    messageTransmitter: "0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9",
    tokenMessengerMinter: "0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9"
  },
  objects: {
    messageTransmitter: "0xcbb70e4f5d89b4a37e850c22d7c994e32c31e9cf693e9633784e482e9a879e0c",
    tokenMessengerMinter: "0x1fbf4458a00a842a4774f441fac7a41f2da0488dd93a43880e76d58789144e17",
    usdc: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832"
  }
};

// 我们部署的跨链合约地址
const CROSS_CHAIN_MODULE_ADDRESS = "0xba916e9cbf294e552e4281dfc227fadbd3413d81c2fc233816f85dd89d53f54c";

export interface AptosReceiveParams {
  messageBytes: string;        // 从Base链传来的消息字节
  attestation: string;         // Circle提供的签名证明
  recipientPrivateKey?: string; // 接收者私钥（可选，用于自动签名）
}

export interface AptosReceiveResult {
  txHash: string;              // Aptos交易哈希
  success: boolean;            // 是否成功
  usdcAmount?: string;         // 实际接收的USDC数量
}

/**
 * Aptos CCTP接收器类
 * 负责在Aptos链上接收并铸造从Base链发送的USDC
 */
export class AptosCCTPReceiver {
  private aptos: Aptos;
  private config: AptosConfig;

  constructor() {
    // 初始化Aptos客户端
    this.config = new AptosConfig({
      network: APTOS_TESTNET_CONFIG.network
    });
    this.aptos = new Aptos(this.config);
  }

  /**
   * 验证消息字节格式
   */
  private validateMessageBytes(messageBytes: string): boolean {
    // 基本验证：应该是十六进制字符串
    if (!messageBytes || typeof messageBytes !== 'string') {
      console.log('消息字节为空或不是字符串:', messageBytes);
      return false;
    }
    
    const isValid = messageBytes.startsWith('0x') && messageBytes.length > 10;
    console.log('消息字节验证:', {
      messageBytes: messageBytes.substring(0, 50) + '...',
      length: messageBytes.length,
      startsWithOx: messageBytes.startsWith('0x'),
      isValid
    });
    
    return isValid;
  }

  /**
   * 验证attestation格式
   */
  private validateAttestation(attestation: string): boolean {
    // 基本验证：应该是十六进制字符串
    return attestation.startsWith('0x') && attestation.length > 10;
  }

  /**
   * 将十六进制字符串转换为字节数组
   */
  private hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.replace('0x', '');
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  /**
   * 检查USDC余额
   */
  async checkUSDCBalance(address: string): Promise<string> {
    try {
      console.log('检查Aptos USDC余额...', address);

      // 使用正确的资源类型查询USDC余额
      const resource = await this.aptos.getAccountResource({
        accountAddress: address,
        resourceType: `0x1::coin::CoinStore<${APTOS_TESTNET_CONFIG.objects.usdc}::coin::USDC>`
      });

      console.log('USDC余额查询成功');
      return (resource.data as any)?.coin?.value || '0';

    } catch (error) {
      console.log('USDC余额查询失败（可能是新账户）:', error);
      return '0';
    }
  }

  /**
   * 接收CCTP消息并铸造USDC（使用私钥自动签名）
   */
  async receiveCCTPUSDC(params: AptosReceiveParams): Promise<AptosReceiveResult> {
    try {
      console.log('开始Aptos端CCTP接收...');

      // 验证输入参数
      if (!this.validateMessageBytes(params.messageBytes)) {
        throw new Error('无效的消息字节格式');
      }

      if (!this.validateAttestation(params.attestation)) {
        throw new Error('无效的attestation格式');
      }

      // 创建账户（如果提供了私钥）
      if (!params.recipientPrivateKey) {
        throw new Error('需要提供接收者私钥进行签名');
      }

      const privateKey = new Ed25519PrivateKey(params.recipientPrivateKey);
      const account = Account.fromPrivateKey({ privateKey });
      const accountAddress = account.accountAddress.toString();

      console.log('接收账户地址:', accountAddress);

      // 检查USDC CoinStore是否存在，如果不存在则跳过注册（Circle USDC可能不需要手动注册）
      console.log('检查USDC CoinStore状态...');
      try {
        const balanceBefore = await this.checkUSDCBalance(accountAddress);
        console.log('✅ USDC CoinStore已存在或无需注册');
      } catch (error) {
        console.log('⚠️ USDC CoinStore不存在，但Circle USDC可能不需要手动注册，继续尝试接收...');
      }

      // 检查接收前的USDC余额
      const balanceBefore = await this.checkUSDCBalance(accountAddress);
      console.log('接收前USDC余额:', balanceBefore);

      // 转换参数为Move格式
      const messageBytesArray = Array.from(this.hexToBytes(params.messageBytes));
      const attestationArray = Array.from(this.hexToBytes(params.attestation));

      console.log('准备调用Move合约...');
      console.log('消息字节长度:', messageBytesArray.length);
      console.log('签名字节长度:', attestationArray.length);

      // 构建交易
      const transaction = await this.aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          // 调用我们部署的跨链接收合约
          function: `${CROSS_CHAIN_MODULE_ADDRESS}::cctp_receiver::receive_cctp_usdc`,
          functionArguments: [
            messageBytesArray,  // message_bytes: vector<u8>
            attestationArray    // attestation: vector<u8>
          ],
        },
      });

      console.log('交易构建完成，开始签名和提交...');

      // 签名并提交交易
      const pendingTxn = await this.aptos.signAndSubmitTransaction({
        signer: account,
        transaction,
      });

      console.log('交易已提交，等待确认...', pendingTxn.hash);

      // 等待交易确认
      const txnResult = await this.aptos.waitForTransaction({
        transactionHash: pendingTxn.hash,
      });

      console.log('交易确认成功!');

      // 检查交易是否成功
      if (!txnResult.success) {
        throw new Error(`交易失败: ${txnResult.vm_status}`);
      }

      // 检查接收后的USDC余额
      const balanceAfter = await this.checkUSDCBalance(accountAddress);
      const receivedAmount = (BigInt(balanceAfter) - BigInt(balanceBefore)).toString();

      console.log('接收后USDC余额:', balanceAfter);
      console.log('实际接收数量:', receivedAmount);

      return {
        txHash: pendingTxn.hash,
        success: true,
        usdcAmount: receivedAmount
      };

    } catch (error) {
      console.error('❌ Aptos CCTP接收失败:', error);
      return {
        txHash: '',
        success: false,
        usdcAmount: '0'
      };
    }
  }

  /**
   * 使用外部钱包签名接收CCTP消息（返回未签名交易）
   */
  async buildReceiveCCTPTransaction(
    params: {
      messageBytes: string;
      attestation: string;
      senderAddress: string;
    }
  ) {
    try {
      console.log('构建CCTP接收交易...');

      // 验证输入参数
      if (!this.validateMessageBytes(params.messageBytes)) {
        throw new Error('无效的消息字节格式');
      }

      if (!this.validateAttestation(params.attestation)) {
        throw new Error('无效的attestation格式');
      }

      // 转换参数
      const messageBytesArray = Array.from(this.hexToBytes(params.messageBytes));
      const attestationArray = Array.from(this.hexToBytes(params.attestation));

      // 构建交易（不签名）
      const transaction = await this.aptos.transaction.build.simple({
        sender: AccountAddress.fromString(params.senderAddress),
        data: {
          function: `${CROSS_CHAIN_MODULE_ADDRESS}::cctp_receiver::receive_cctp_usdc`,
          functionArguments: [
            messageBytesArray,
            attestationArray
          ],
        },
      });

      console.log('✅ 交易构建完成，可以发送给钱包签名');

      return transaction;

    } catch (error) {
      console.error('构建交易失败:', error);
      throw error;
    }
  }

  /**
   * 查询CCTP接收事件
   */
  async getCCTPReceiveEvents(address: string, limit: number = 10) {
    try {
      console.log('查询CCTP接收事件...');

      // 查询账户的事件
      const events = await this.aptos.getAccountEventsByEventType({
        accountAddress: address,
        eventType: `${CROSS_CHAIN_MODULE_ADDRESS}::cctp_receiver::CCTPReceiveEvent`,
        minimumLedgerVersion: 0,
        options: {
          limit: limit
        }
      });

      console.log(`找到 ${events.length} 个CCTP接收事件`);
      return events;

    } catch (error) {
      console.error('查询事件失败:', error);
      return [];
    }
  }

  /**
   * 检查消息是否已经被处理过
   */
  async isMessageProcessed(messageHash: string): Promise<boolean> {
    try {
      // 调用Circle的MessageTransmitter查询函数
      const result = await this.aptos.view({
        payload: {
          function: `${APTOS_TESTNET_CONFIG.packages.messageTransmitter}::message_transmitter::is_nonce_used`,
          functionArguments: [messageHash]
        }
      });

      return result[0] as boolean;

    } catch (error) {
      console.error('检查消息状态失败:', error);
      return false;
    }
  }

  /**
   * 获取账户信息
   */
  async getAccountInfo(address: string) {
    try {
      const account = await this.aptos.getAccountInfo({
        accountAddress: address
      });
      return account;
    } catch (error) {
      console.error('获取账户信息失败:', error);
      return null;
    }
  }

  /**
   * 创建新的Aptos账户（用于测试）
   */
  createTestAccount(): Account {
    const account = Account.generate();
    console.log('创建测试账户:', {
      address: account.accountAddress.toString(),
      privateKey: account.privateKey.toString(),
      publicKey: account.publicKey.toString()
    });
    return account;
  }
}

// 导出单例实例
export const aptosCCTPReceiver = new AptosCCTPReceiver();

// 导出配置
export { APTOS_TESTNET_CONFIG, CROSS_CHAIN_MODULE_ADDRESS };