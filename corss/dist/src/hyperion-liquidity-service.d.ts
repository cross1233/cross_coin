export interface AddLiquidityParams {
    userPrivateKey: string;
    usdcAmount: string;
    aptAmount: string;
    tickLower: number;
    tickUpper: number;
    feeTier: number;
    slippageToleranceBps: number;
    deadlineMinutes: number;
}
export interface LiquidityResult {
    success: boolean;
    txHash?: string;
    positionAddress?: string;
    actualUsdcAmount?: string;
    actualAptAmount?: string;
    liquidityAmount?: string;
    error?: string;
}
/**
 * Hyperion流动性服务类
 * 提供APT/USDC流动性添加功能
 */
export declare class HyperionLiquidityService {
    private aptos;
    private config;
    constructor();
    /**
     * 🎯 主要功能：添加APT/USDC流动性
     */
    addLiquidity(params: AddLiquidityParams): Promise<LiquidityResult>;
    /**
     * 验证用户余额
     */
    private validateBalances;
    /**
     * 获取APT余额
     */
    getAptBalance(address: string): Promise<string>;
    /**
     * 获取USDC余额
     */
    getUsdcBalance(address: string): Promise<string>;
    /**
     * 解析交易结果
     */
    private parseTransactionResult;
    /**
     * 🔍 查询用户的流动性Positions
     */
    getUserPositions(userAddress: string): Promise<any[]>;
    /**
     * 🔍 获取Position详情
     */
    getPositionDetails(positionAddress: string): Promise<{
        liquidity: string;
        tickLower: number;
        tickUpper: number;
    } | null>;
    /**
     * 💡 估算添加流动性所需的代币数量
     */
    estimateLiquidityAmounts(tickLower: number, tickUpper: number, feeTier: number, usdcAmount: string, aptAmount: string): Promise<{
        liquidity: string;
        optimalUsdc: string;
        optimalApt: string;
    } | null>;
    /**
     * 工具函数：解析小数金额为最小单位
     */
    private parseDecimalAmount;
    /**
     * 工具函数：格式化最小单位为可读金额
     */
    private formatAmount;
    /**
     * 🔧 检查合约配置状态
     */
    getContractConfig(): Promise<{
        admin: string;
        hyperionRouter: string;
        paused: boolean;
    } | null>;
}
export declare const hyperionLiquidityService: HyperionLiquidityService;
export declare const COMMON_PRESETS: {
    FEE_TIERS: {
        VERY_LOW: number;
        LOW: number;
        MEDIUM: number;
        HIGH: number;
    };
    TICK_RANGES: {
        NARROW: {
            lower: number;
            upper: number;
        };
        MEDIUM: {
            lower: number;
            upper: number;
        };
        WIDE: {
            lower: number;
            upper: number;
        };
    };
    SLIPPAGE: {
        LOW: number;
        MEDIUM: number;
        HIGH: number;
    };
};
//# sourceMappingURL=hyperion-liquidity-service.d.ts.map