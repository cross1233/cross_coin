import { ethers } from 'ethers';
export interface AttestationData {
    status: 'pending' | 'complete' | 'failed';
    messageHash: string;
    messageBytes: string;
    attestation: string;
}
export interface MessageSentEvent {
    messageHash: string;
    messageBytes?: string;
    nonce: string;
    sender: string;
    recipient: string;
    destinationDomain: number;
}
/**
 * Circle Attestation 获取器类
 * 负责从Circle API获取跨链消息的签名证明
 */
export declare class CircleAttestationService {
    /**
     * 从Base链交易日志中提取MessageSent事件
     * @param txHash - Base链的交易哈希
     * @param provider - ethers provider
     */
    extractMessageFromTransaction(txHash: string, provider: ethers.Provider): Promise<MessageSentEvent>;
    /**
     * 从Circle API获取attestation签名
     * @param messageHash - 消息哈希
     * @param txHash - 交易哈希（用于提取消息字节）
     * @param provider - ethers provider
     */
    getAttestation(messageHash: string, txHash?: string, provider?: ethers.Provider): Promise<AttestationData>;
    /**
     * 完整的attestation获取流程
     * @param txHash - Base链交易哈希
     * @param provider - ethers provider
     */
    getAttestationFromTransaction(txHash: string, provider: ethers.Provider): Promise<AttestationData>;
    /**
     * 验证attestation数据的有效性
     */
    validateAttestationData(data: AttestationData): boolean;
    /**
     * 获取attestation状态（不等待完成）
     */
    checkAttestationStatus(messageHash: string): Promise<AttestationData>;
    /**
     * 工具函数：睡眠指定毫秒数
     */
    private sleep;
    /**
     * 计算预估等待时间
     */
    getEstimatedWaitTime(): string;
}
export declare const circleAttestationService: CircleAttestationService;
//# sourceMappingURL=circle-attestation.d.ts.map