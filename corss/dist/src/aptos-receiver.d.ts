import { Network, Account } from '@aptos-labs/ts-sdk';
declare const APTOS_TESTNET_CONFIG: {
    network: Network;
    rpcUrl: string;
    domainId: number;
    packages: {
        messageTransmitter: string;
        tokenMessengerMinter: string;
    };
    objects: {
        messageTransmitter: string;
        tokenMessengerMinter: string;
        usdc: string;
    };
};
declare const CROSS_CHAIN_MODULE_ADDRESS = "0xba916e9cbf294e552e4281dfc227fadbd3413d81c2fc233816f85dd89d53f54c";
export interface AptosReceiveParams {
    messageBytes: string;
    attestation: string;
    recipientPrivateKey?: string;
}
export interface AptosReceiveResult {
    txHash: string;
    success: boolean;
    usdcAmount?: string;
}
/**
 * Aptos CCTP接收器类
 * 负责在Aptos链上接收并铸造从Base链发送的USDC
 */
export declare class AptosCCTPReceiver {
    private aptos;
    private config;
    constructor();
    /**
     * 验证消息字节格式
     */
    private validateMessageBytes;
    /**
     * 验证attestation格式
     */
    private validateAttestation;
    /**
     * 将十六进制字符串转换为字节数组
     */
    private hexToBytes;
    /**
     * 检查USDC余额
     */
    checkUSDCBalance(address: string): Promise<string>;
    /**
     * 接收CCTP消息并铸造USDC（使用私钥自动签名）
     */
    receiveCCTPUSDC(params: AptosReceiveParams): Promise<AptosReceiveResult>;
    /**
     * 使用外部钱包签名接收CCTP消息（返回未签名交易）
     */
    buildReceiveCCTPTransaction(params: {
        messageBytes: string;
        attestation: string;
        senderAddress: string;
    }): Promise<import("@aptos-labs/ts-sdk").SimpleTransaction>;
    /**
     * 查询CCTP接收事件
     */
    getCCTPReceiveEvents(address: string, limit?: number): Promise<{
        account_address: string;
        creation_number: any;
        data: any;
        event_index: any;
        sequence_number: any;
        transaction_block_height: any;
        transaction_version: any;
        type: string;
        indexed_type: string;
    }[]>;
    /**
     * 检查消息是否已经被处理过
     */
    isMessageProcessed(messageHash: string): Promise<boolean>;
    /**
     * 获取账户信息
     */
    getAccountInfo(address: string): Promise<import("@aptos-labs/ts-sdk").AccountData | null>;
    /**
     * 创建新的Aptos账户（用于测试）
     */
    createTestAccount(): Account;
}
export declare const aptosCCTPReceiver: AptosCCTPReceiver;
export { APTOS_TESTNET_CONFIG, CROSS_CHAIN_MODULE_ADDRESS };
//# sourceMappingURL=aptos-receiver.d.ts.map