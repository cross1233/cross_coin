import { ethers } from 'ethers';
declare const BASE_SEPOLIA_CONFIG: {
    chainId: number;
    rpcUrl: string;
    domainId: number;
    contracts: {
        tokenMessengerV2: string;
        messageTransmitterV2: string;
        tokenMinterV2: string;
        usdc: string;
    };
};
declare const APTOS_DOMAIN_ID = 9;
/**
 * 将EVM地址转换为Aptos地址格式
 * 根据Circle文档，需要将20字节的EVM地址填充为32字节
 */
declare function evmToAptosAddress(evmAddress: string): string;
/**
 * 将Aptos地址转换为bytes32格式（用于跨链消息）
 */
declare function aptosAddressToBytes32(aptosAddress: string): string;
export interface CrossChainParams {
    amount: string;
    recipientAddress: string;
    signer: ethers.Signer;
}
export interface CrossChainResult {
    txHash: string;
    nonce: string;
    messageBytes?: string;
}
/**
 * Base链CCTP跨链发送器类
 */
export declare class BaseCCTPSender {
    private provider;
    private tokenMessengerContract;
    private usdcContract;
    constructor();
    /**
     * 检查用户USDC余额
     */
    checkUSDCBalance(userAddress: string): Promise<string>;
    /**
     * 批准USDC转账（必须在depositForBurn之前调用）
     */
    approveUSDC(params: {
        amount: string;
        signer: ethers.Signer;
    }): Promise<string>;
    /**
     * 执行跨链转账（烧毁Base链USDC，发送到Aptos链）
     */
    depositForBurn(params: CrossChainParams): Promise<CrossChainResult>;
    /**
     * 一键完成：检查余额 -> 批准 -> 跨链转账
     */
    executeFullCrossChain(params: CrossChainParams): Promise<CrossChainResult>;
}
export { evmToAptosAddress, aptosAddressToBytes32, BASE_SEPOLIA_CONFIG, APTOS_DOMAIN_ID };
//# sourceMappingURL=base-sender.d.ts.map