/**
 * 确保账户有USDC CoinStore（检查并注册）
 */
export declare function ensureUSDCCoinStore(accountAddress: string, privateKey: string): Promise<{
    registered: boolean;
    txHash?: string;
    alreadyExists: boolean;
}>;
/**
 * 查询USDC余额（注册后）
 */
export declare function checkUSDCBalance(accountAddress: string): Promise<string>;
//# sourceMappingURL=usdc-coinstore-register.d.ts.map