"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMON_PRESETS = exports.hyperionLiquidityService = exports.HyperionLiquidityService = void 0;
const ts_sdk_1 = require("@aptos-labs/ts-sdk");
// Hyperion配置
const HYPERION_CONFIG = {
    // 测试网Hyperion合约地址
    contractAddress: "0x3673bee9e7b78ae63d4a9e3d58425bc97e7f3b8d68efc846ee732b14369333dd",
    // 我们的wrapper合约地址
    wrapperAddress: "0xba916e9cbf294e552e4281dfc227fadbd3413d81c2fc233816f85dd89d53f54c",
    // USDC metadata地址（Circle官方）
    usdcMetadata: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832"
};
/**
 * Hyperion流动性服务类
 * 提供APT/USDC流动性添加功能
 */
class HyperionLiquidityService {
    constructor() {
        this.config = new ts_sdk_1.AptosConfig({
            network: ts_sdk_1.Network.TESTNET
        });
        this.aptos = new ts_sdk_1.Aptos(this.config);
    }
    /**
     * 🎯 主要功能：添加APT/USDC流动性
     */
    async addLiquidity(params) {
        try {
            console.log('🚀 开始添加APT/USDC流动性到Hyperion...');
            // 1. 创建用户账户
            const privateKey = new ts_sdk_1.Ed25519PrivateKey(params.userPrivateKey);
            const account = ts_sdk_1.Account.fromPrivateKey({ privateKey });
            const userAddress = account.accountAddress.toString();
            console.log('用户地址:', userAddress);
            // 2. 验证余额
            await this.validateBalances(userAddress, params.usdcAmount, params.aptAmount);
            // 3. 转换参数
            const usdcAmountMicro = this.parseDecimalAmount(params.usdcAmount, 6); // USDC 6位小数
            const aptAmountOcta = this.parseDecimalAmount(params.aptAmount, 8); // APT 8位小数
            const deadline = Math.floor(Date.now() / 1000) + (params.deadlineMinutes * 60);
            console.log('转换后的数量:', {
                usdcAmountMicro: usdcAmountMicro.toString(),
                aptAmountOcta: aptAmountOcta.toString(),
                deadline
            });
            // 4. 构建交易
            const transaction = await this.aptos.transaction.build.simple({
                sender: account.accountAddress,
                data: {
                    function: `${HYPERION_CONFIG.wrapperAddress}::hyperion_liquidity_v2::add_apt_usdc_liquidity`,
                    functionArguments: [
                        usdcAmountMicro, // usdc_amount: u64
                        aptAmountOcta, // apt_amount: u64
                        params.tickLower, // tick_lower: u32
                        params.tickUpper, // tick_upper: u32
                        params.feeTier, // fee_tier: u8
                        params.slippageToleranceBps, // slippage_tolerance_bps: u64
                        deadline // deadline: u64
                    ],
                },
            });
            console.log('交易构建完成，开始签名和提交...');
            // 5. 签名并提交
            const pendingTxn = await this.aptos.signAndSubmitTransaction({
                signer: account,
                transaction,
            });
            console.log('交易已提交:', pendingTxn.hash);
            // 6. 等待确认
            const txnResult = await this.aptos.waitForTransaction({
                transactionHash: pendingTxn.hash,
            });
            if (!txnResult.success) {
                throw new Error(`交易失败: ${txnResult.vm_status}`);
            }
            console.log('✅ 流动性添加成功!');
            // 7. 解析结果
            const result = await this.parseTransactionResult(txnResult, userAddress);
            return {
                success: true,
                txHash: pendingTxn.hash,
                ...result
            };
        }
        catch (error) {
            console.error('❌ 添加流动性失败:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * 验证用户余额
     */
    async validateBalances(userAddress, usdcAmount, aptAmount) {
        console.log('检查用户余额...');
        // 检查APT余额
        const aptBalance = await this.getAptBalance(userAddress);
        const requiredApt = this.parseDecimalAmount(aptAmount, 8);
        if (BigInt(aptBalance) < requiredApt) {
            throw new Error(`APT余额不足: 需要 ${aptAmount}, 当前 ${this.formatAmount(aptBalance, 8)}`);
        }
        // 检查USDC余额
        const usdcBalance = await this.getUsdcBalance(userAddress);
        const requiredUsdc = this.parseDecimalAmount(usdcAmount, 6);
        if (BigInt(usdcBalance) < requiredUsdc) {
            throw new Error(`USDC余额不足: 需要 ${usdcAmount}, 当前 ${this.formatAmount(usdcBalance, 6)}`);
        }
        console.log('✅ 余额检查通过');
    }
    /**
     * 获取APT余额
     */
    async getAptBalance(address) {
        try {
            const resource = await this.aptos.getAccountResource({
                accountAddress: address,
                resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
            });
            return resource.data?.coin?.value || '0';
        }
        catch (error) {
            console.log('APT余额查询失败，可能是新账户:', error);
            return '0';
        }
    }
    /**
     * 获取USDC余额
     */
    async getUsdcBalance(address) {
        try {
            const balance = await this.aptos.getCurrentFungibleAssetBalances({
                options: {
                    where: {
                        owner_address: { _eq: address },
                        asset_type: { _eq: HYPERION_CONFIG.usdcMetadata }
                    }
                }
            });
            return balance[0]?.amount || '0';
        }
        catch (error) {
            console.log('USDC余额查询失败:', error);
            return '0';
        }
    }
    /**
     * 解析交易结果
     */
    async parseTransactionResult(txnResult, userAddress) {
        try {
            // 查找AddLiquidityEvent事件
            const events = txnResult.events || [];
            const liquidityEvent = events.find((event) => event.type.includes('AddLiquidityEvent'));
            if (liquidityEvent) {
                const eventData = liquidityEvent.data;
                return {
                    positionAddress: eventData.position_address,
                    actualUsdcAmount: this.formatAmount(eventData.actual_usdc, 6),
                    actualAptAmount: this.formatAmount(eventData.actual_apt, 8),
                    liquidityAmount: eventData.liquidity_amount
                };
            }
            return {};
        }
        catch (error) {
            console.warn('解析交易结果失败:', error);
            return {};
        }
    }
    /**
     * 🔍 查询用户的流动性Positions
     */
    async getUserPositions(userAddress) {
        try {
            const result = await this.aptos.view({
                payload: {
                    function: `${HYPERION_CONFIG.wrapperAddress}::hyperion_liquidity_v2::get_user_positions`,
                    functionArguments: [userAddress]
                }
            });
            return result[0] || [];
        }
        catch (error) {
            console.error('查询用户Positions失败:', error);
            return [];
        }
    }
    /**
     * 🔍 获取Position详情
     */
    async getPositionDetails(positionAddress) {
        try {
            const result = await this.aptos.view({
                payload: {
                    function: `${HYPERION_CONFIG.wrapperAddress}::hyperion_liquidity_v2::get_position_info`,
                    functionArguments: [positionAddress]
                }
            });
            const [liquidity, tickLower, tickUpper] = result;
            return {
                liquidity,
                tickLower,
                tickUpper
            };
        }
        catch (error) {
            console.error('查询Position详情失败:', error);
            return null;
        }
    }
    /**
     * 💡 估算添加流动性所需的代币数量
     */
    async estimateLiquidityAmounts(tickLower, tickUpper, feeTier, usdcAmount, aptAmount) {
        try {
            const usdcAmountMicro = this.parseDecimalAmount(usdcAmount, 6);
            const aptAmountOcta = this.parseDecimalAmount(aptAmount, 8);
            const result = await this.aptos.view({
                payload: {
                    function: `${HYPERION_CONFIG.wrapperAddress}::hyperion_liquidity_v2::estimate_liquidity_amounts`,
                    functionArguments: [
                        tickLower,
                        tickUpper,
                        feeTier,
                        usdcAmountMicro,
                        aptAmountOcta
                    ]
                }
            });
            const [liquidity, optimalUsdcRaw, optimalAptRaw] = result;
            return {
                liquidity,
                optimalUsdc: this.formatAmount(optimalUsdcRaw, 6),
                optimalApt: this.formatAmount(optimalAptRaw, 8)
            };
        }
        catch (error) {
            console.error('估算流动性数量失败:', error);
            return null;
        }
    }
    /**
     * 工具函数：解析小数金额为最小单位
     */
    parseDecimalAmount(amount, decimals) {
        const parts = amount.split('.');
        const integerPart = parts[0] || '0';
        const fractionalPart = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
        return BigInt(integerPart + fractionalPart);
    }
    /**
     * 工具函数：格式化最小单位为可读金额
     */
    formatAmount(amount, decimals) {
        const amountStr = amount.padStart(decimals + 1, '0');
        const integerPart = amountStr.slice(0, -decimals) || '0';
        const fractionalPart = amountStr.slice(-decimals);
        return `${integerPart}.${fractionalPart}`.replace(/\.?0+$/, '');
    }
    /**
     * 🔧 检查合约配置状态
     */
    async getContractConfig() {
        try {
            const result = await this.aptos.view({
                payload: {
                    function: `${HYPERION_CONFIG.wrapperAddress}::hyperion_liquidity_v2::get_config`,
                    functionArguments: []
                }
            });
            const [admin, hyperionRouter, paused] = result;
            return {
                admin,
                hyperionRouter,
                paused
            };
        }
        catch (error) {
            console.error('查询合约配置失败:', error);
            return null;
        }
    }
}
exports.HyperionLiquidityService = HyperionLiquidityService;
// 导出单例实例
exports.hyperionLiquidityService = new HyperionLiquidityService();
// 导出常用的参数预设
exports.COMMON_PRESETS = {
    // 手续费等级
    FEE_TIERS: {
        VERY_LOW: 0, // 0.01%
        LOW: 1, // 0.05%
        MEDIUM: 2, // 0.3%
        HIGH: 3 // 1%
    },
    // 常用的tick范围（需要根据实际价格调整）
    TICK_RANGES: {
        NARROW: { lower: 199000, upper: 201000 }, // 窄范围，高手续费
        MEDIUM: { lower: 198000, upper: 202000 }, // 中等范围
        WIDE: { lower: 195000, upper: 205000 }, // 宽范围，低手续费
    },
    // 默认滑点设置
    SLIPPAGE: {
        LOW: 50, // 0.5%
        MEDIUM: 100, // 1%
        HIGH: 300 // 3%
    }
};
//# sourceMappingURL=hyperion-liquidity-service.js.map