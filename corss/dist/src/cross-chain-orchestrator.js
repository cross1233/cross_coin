"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crossChainOrchestrator = exports.CrossChainOrchestrator = void 0;
const ethers_1 = require("ethers");
const base_sender_1 = require("./base-sender");
const circle_attestation_1 = require("./circle-attestation");
const aptos_receiver_1 = require("./aptos-receiver");
/**
 * Base到Aptos跨链编排器
 * 负责协调整个跨链流程的执行
 */
class CrossChainOrchestrator {
    constructor() {
        this.baseSender = new base_sender_1.BaseCCTPSender();
        this.attestationService = circle_attestation_1.circleAttestationService;
        this.aptosReceiver = aptos_receiver_1.aptosCCTPReceiver;
    }
    /**
     * 执行完整的Base到Aptos跨链流程
     */
    async executeCrossChain(params) {
        const result = {
            success: false,
            steps: {}
        };
        try {
            this.logProgress(params, '🚀 开始Base到Aptos USDC跨链转账');
            // ========== 第一步：Base链发起跨链 ==========
            this.logProgress(params, '📤 第1步：在Base链发起跨链转账', {
                amount: params.amount,
                recipient: params.recipientAddress
            });
            const baseResult = await this.baseSender.executeFullCrossChain({
                amount: params.amount,
                recipientAddress: params.recipientAddress,
                signer: params.baseSigner
            });
            result.steps.baseBurn = baseResult;
            result.baseTxHash = baseResult.txHash;
            this.logProgress(params, '✅ Base链跨链发起成功', {
                txHash: baseResult.txHash,
                nonce: baseResult.nonce
            });
            // ========== 第二步：等待Circle签名 ==========
            this.logProgress(params, '⏳ 第2步：等待Circle attestation签名');
            const baseProvider = new ethers_1.ethers.JsonRpcProvider("https://sepolia.base.org");
            const attestationData = await this.attestationService.getAttestationFromTransaction(baseResult.txHash, baseProvider);
            result.steps.attestation = attestationData;
            this.logProgress(params, '✅ Circle签名获取成功', {
                messageHash: attestationData.messageHash,
                attestationLength: attestationData.attestation.length
            });
            // ========== 第三步：Aptos链接收USDC ==========
            this.logProgress(params, '📥 第3步：在Aptos链接收USDC');
            console.log('准备Aptos接收参数:', {
                messageBytesLength: attestationData.messageBytes?.length || 0,
                attestationLength: attestationData.attestation?.length || 0,
                messageBytes: attestationData.messageBytes?.substring(0, 100) + '...',
                attestation: attestationData.attestation?.substring(0, 100) + '...'
            });
            const aptosReceiveParams = {
                messageBytes: attestationData.messageBytes,
                attestation: attestationData.attestation,
                recipientPrivateKey: params.aptosPrivateKey
            };
            const aptosResult = await this.aptosReceiver.receiveCCTPUSDC(aptosReceiveParams);
            result.steps.aptosReceive = aptosResult;
            if (!aptosResult.success) {
                throw new Error(`Aptos接收失败: ${aptosResult.txHash}`);
            }
            result.aptosTxHash = aptosResult.txHash;
            result.finalUSDCAmount = aptosResult.usdcAmount;
            this.logProgress(params, '✅ Aptos USDC接收成功', {
                txHash: aptosResult.txHash,
                amount: aptosResult.usdcAmount
            });
            // ========== 跨链完成 ==========
            result.success = true;
            this.logProgress(params, '🎉 跨链转账完成!', {
                baseTx: result.baseTxHash,
                aptosTx: result.aptosTxHash,
                finalAmount: result.finalUSDCAmount
            });
            return result;
        }
        catch (error) {
            console.error('❌ 跨链转账失败:', error);
            result.error = error instanceof Error ? error.message : String(error);
            this.logProgress(params, '❌ 跨链转账失败', { error: result.error });
            return result;
        }
    }
    /**
     * 检查跨链前置条件
     */
    async checkPrerequisites(params) {
        const issues = [];
        try {
            // 检查Base链USDC余额
            const userAddress = await params.baseSigner.getAddress();
            const usdcBalance = await this.baseSender.checkUSDCBalance(userAddress);
            if (parseFloat(usdcBalance) < parseFloat(params.amount)) {
                issues.push(`Base链USDC余额不足：当前 ${usdcBalance}，需要 ${params.amount}`);
            }
            // 检查Aptos地址格式
            if (!params.recipientAddress.startsWith('0x') || params.recipientAddress.length !== 66) {
                issues.push('Aptos接收地址格式无效');
            }
            // 检查Aptos私钥格式
            if (!params.aptosPrivateKey.startsWith('0x') || params.aptosPrivateKey.length !== 66) {
                issues.push('Aptos私钥格式无效');
            }
            // 检查网络连接
            try {
                await this.baseSender.checkUSDCBalance(userAddress);
            }
            catch (error) {
                issues.push('无法连接到Base测试网');
            }
            // 检查Aptos网络
            try {
                await this.aptosReceiver.getAccountInfo(params.recipientAddress);
            }
            catch (error) {
                issues.push('无法连接到Aptos测试网或账户不存在');
            }
        }
        catch (error) {
            issues.push(`前置检查失败: ${error}`);
        }
        return {
            valid: issues.length === 0,
            issues
        };
    }
    /**
     * 估算跨链费用和时间
     */
    async estimateCrossChainCost() {
        return {
            estimatedTime: '3-5分钟',
            baseFee: '~0.001 ETH (gas费用)',
            aptosFee: '~0.01 APT (gas费用)',
            totalTime: '等待Circle签名: 1-3分钟 + 链上交易: 1-2分钟'
        };
    }
    /**
     * 监听跨链状态（用于实时更新）
     */
    async monitorCrossChainStatus(baseTxHash, callback) {
        try {
            // 监听Base链交易确认
            callback('base_confirming', { txHash: baseTxHash });
            // 监听Circle签名进度
            callback('waiting_attestation');
            // 这里可以实现实时状态监听
            // 比如轮询Circle API，检查签名状态等
        }
        catch (error) {
            callback('error', { error: error instanceof Error ? error.message : String(error) });
        }
    }
    /**
     * 记录进度日志
     */
    logProgress(params, message, details) {
        console.log(message, details || '');
        // 调用用户提供的进度回调
        if (params.onProgress) {
            params.onProgress(message, details);
        }
    }
    /**
     * 获取跨链历史记录
     */
    async getCrossChainHistory(address) {
        try {
            // 获取Aptos链上的CCTP接收事件
            const events = await this.aptosReceiver.getCCTPReceiveEvents(address);
            return events.map(event => ({
                timestamp: event.sequence_number,
                recipient: event.data.recipient,
                amount: event.data.amount,
                sourceHash: event.data.message_hash,
                txHash: event.transaction_version?.toString() || ''
            }));
        }
        catch (error) {
            console.error('获取跨链历史失败:', error);
            return [];
        }
    }
}
exports.CrossChainOrchestrator = CrossChainOrchestrator;
// 导出单例实例
exports.crossChainOrchestrator = new CrossChainOrchestrator();
//# sourceMappingURL=cross-chain-orchestrator.js.map