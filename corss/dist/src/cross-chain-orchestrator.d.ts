import { ethers } from 'ethers';
import { CrossChainResult } from './base-sender';
import { AttestationData } from './circle-attestation';
import { AptosReceiveResult } from './aptos-receiver';
/**
 * 完整的跨链流程参数
 */
export interface FullCrossChainParams {
    amount: string;
    recipientAddress: string;
    baseSigner: ethers.Signer;
    aptosPrivateKey: string;
    maxWaitTime?: number;
    onProgress?: (step: string, details?: any) => void;
}
/**
 * 跨链结果
 */
export interface FullCrossChainResult {
    success: boolean;
    baseTxHash?: string;
    aptosTxHash?: string;
    finalUSDCAmount?: string;
    error?: string;
    steps: {
        baseBurn?: CrossChainResult;
        attestation?: AttestationData;
        aptosReceive?: AptosReceiveResult;
    };
}
/**
 * Base到Aptos跨链编排器
 * 负责协调整个跨链流程的执行
 */
export declare class CrossChainOrchestrator {
    private baseSender;
    private attestationService;
    private aptosReceiver;
    constructor();
    /**
     * 执行完整的Base到Aptos跨链流程
     */
    executeCrossChain(params: FullCrossChainParams): Promise<FullCrossChainResult>;
    /**
     * 检查跨链前置条件
     */
    checkPrerequisites(params: FullCrossChainParams): Promise<{
        valid: boolean;
        issues: string[];
    }>;
    /**
     * 估算跨链费用和时间
     */
    estimateCrossChainCost(): Promise<{
        estimatedTime: string;
        baseFee: string;
        aptosFee: string;
        totalTime: string;
    }>;
    /**
     * 监听跨链状态（用于实时更新）
     */
    monitorCrossChainStatus(baseTxHash: string, callback: (status: string, data?: any) => void): Promise<void>;
    /**
     * 记录进度日志
     */
    private logProgress;
    /**
     * 获取跨链历史记录
     */
    getCrossChainHistory(address: string): Promise<{
        timestamp: any;
        recipient: any;
        amount: any;
        sourceHash: any;
        txHash: any;
    }[]>;
}
export declare const crossChainOrchestrator: CrossChainOrchestrator;
//# sourceMappingURL=cross-chain-orchestrator.d.ts.map