"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.circleAttestationService = exports.CircleAttestationService = void 0;
const ethers_1 = require("ethers");
// Circle Attestation API 配置
const CIRCLE_API_CONFIG = {
    // Circle的官方测试网API端点
    baseUrl: 'https://iris-api-sandbox.circle.com',
    // 轮询间隔（毫秒）
    pollInterval: 2000,
    // 最大等待时间（毫秒）- 5分钟
    maxWaitTime: 5 * 60 * 1000,
    // 最大重试次数
    maxRetries: 150
};
/**
 * Circle Attestation 获取器类
 * 负责从Circle API获取跨链消息的签名证明
 */
class CircleAttestationService {
    /**
     * 从Base链交易日志中提取MessageSent事件
     * @param txHash - Base链的交易哈希
     * @param provider - ethers provider
     */
    async extractMessageFromTransaction(txHash, provider) {
        try {
            console.log('从交易中提取跨链消息...', txHash);
            // 获取交易回执
            const receipt = await provider.getTransactionReceipt(txHash);
            if (!receipt) {
                throw new Error('无法获取交易回执');
            }
            console.log('交易回执获取成功，开始解析事件日志...');
            // 尝试多种可能的MessageSent事件签名
            const possibleEventSignatures = [
                'MessageSent(bytes)',
                'MessageSent(bytes message)',
                'DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, bytes32 destinationTokenMessenger, bytes32 destinationCaller)'
            ];
            let messageSentLog = null;
            let usedSignature = '';
            for (const signature of possibleEventSignatures) {
                const topicHash = ethers_1.ethers.id(signature);
                messageSentLog = receipt.logs.find(log => log.topics[0] === topicHash);
                if (messageSentLog) {
                    usedSignature = signature;
                    break;
                }
            }
            if (!messageSentLog) {
                console.log('所有交易日志:');
                receipt.logs.forEach((log, i) => {
                    console.log(`  日志 ${i}: ${log.topics[0]} (来自 ${log.address})`);
                });
                throw new Error('未找到MessageSent或DepositForBurn事件，请检查合约地址和交易');
            }
            console.log(`找到事件: ${usedSignature}`);
            console.log('找到MessageSent事件，开始解析...');
            // 根据不同的事件类型解码数据
            let messageBytes;
            const abiCoder = new ethers_1.ethers.AbiCoder();
            if (usedSignature.includes('DepositForBurn')) {
                // 对于DepositForBurn事件，我们需要构造消息字节
                // 这是一个简化的实现，实际的消息格式更复杂
                messageBytes = messageSentLog.data;
            }
            else {
                // 对于MessageSent事件
                const decodedData = abiCoder.decode(['bytes'], messageSentLog.data);
                messageBytes = decodedData[0];
            }
            // 计算消息哈希
            const messageHash = ethers_1.ethers.keccak256(messageBytes);
            // 从消息字节中解析详细信息（简化版本）
            // 实际的消息格式更复杂，包含版本、源域、目标域、nonce等信息
            console.log('消息提取成功:', {
                messageHash,
                messageBytesLength: messageBytes.length
            });
            return {
                messageHash,
                messageBytes: messageBytes, // 添加消息字节
                nonce: receipt.logs[0]?.topics[1] || '0', // 简化获取nonce
                sender: receipt.from,
                recipient: '', // 需要从消息字节中解析
                destinationDomain: 9, // Aptos域ID
            };
        }
        catch (error) {
            console.error('提取跨链消息失败:', error);
            throw error;
        }
    }
    /**
     * 从Circle API获取attestation签名
     * @param messageHash - 消息哈希
     * @param txHash - 交易哈希（用于提取消息字节）
     * @param provider - ethers provider
     */
    async getAttestation(messageHash, txHash, provider) {
        try {
            console.log('开始获取Circle attestation...', messageHash);
            const startTime = Date.now();
            let retries = 0;
            while (retries < CIRCLE_API_CONFIG.maxRetries) {
                try {
                    // 检查是否超时
                    if (Date.now() - startTime > CIRCLE_API_CONFIG.maxWaitTime) {
                        throw new Error('获取attestation超时');
                    }
                    console.log(`第 ${retries + 1} 次尝试获取attestation...`);
                    // 调用Circle API
                    const response = await fetch(`${CIRCLE_API_CONFIG.baseUrl}/v1/attestations/${messageHash}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        },
                    });
                    if (!response.ok) {
                        if (response.status === 404) {
                            // 404表示消息还没有被Circle处理，继续等待
                            console.log('消息还在处理中，等待Circle签名...');
                            await this.sleep(CIRCLE_API_CONFIG.pollInterval);
                            retries++;
                            continue;
                        }
                        else {
                            throw new Error(`Circle API错误: ${response.status} ${response.statusText}`);
                        }
                    }
                    const data = await response.json();
                    if (data.status === 'complete' && data.attestation) {
                        console.log('✅ Attestation获取成功!');
                        let messageBytes = data.message || '';
                        // 如果Circle API没有返回消息字节，且我们有交易信息，则从交易中提取
                        if (!messageBytes && txHash && provider) {
                            try {
                                const messageEvent = await this.extractMessageFromTransaction(txHash, provider);
                                messageBytes = messageEvent.messageBytes || '';
                            }
                            catch (error) {
                                console.warn('从交易中提取消息字节失败:', error);
                            }
                        }
                        return {
                            status: 'complete',
                            messageHash: messageHash,
                            messageBytes: messageBytes,
                            attestation: data.attestation
                        };
                    }
                    else if (data.status === 'failed') {
                        throw new Error('Circle签名失败');
                    }
                    else {
                        // 状态为pending，继续等待
                        console.log('Circle正在处理消息，继续等待...');
                        await this.sleep(CIRCLE_API_CONFIG.pollInterval);
                        retries++;
                    }
                }
                catch (error) {
                    if (retries === CIRCLE_API_CONFIG.maxRetries - 1) {
                        throw error;
                    }
                    console.log('请求失败，重试中...', error);
                    await this.sleep(CIRCLE_API_CONFIG.pollInterval);
                    retries++;
                }
            }
            throw new Error('获取attestation超过最大重试次数');
        }
        catch (error) {
            console.error('获取attestation失败:', error);
            throw error;
        }
    }
    /**
     * 完整的attestation获取流程
     * @param txHash - Base链交易哈希
     * @param provider - ethers provider
     */
    async getAttestationFromTransaction(txHash, provider) {
        try {
            console.log('🔄 开始完整的attestation获取流程...');
            // 1. 从交易中提取消息
            const messageEvent = await this.extractMessageFromTransaction(txHash, provider);
            // 2. 使用消息哈希获取attestation
            const attestationData = await this.getAttestation(messageEvent.messageHash, txHash, provider);
            // 确保消息字节存在
            if (!attestationData.messageBytes) {
                attestationData.messageBytes = messageEvent.messageBytes || '';
            }
            console.log('🎉 完整流程完成!');
            return attestationData;
        }
        catch (error) {
            console.error('❌ Attestation获取流程失败:', error);
            throw error;
        }
    }
    /**
     * 验证attestation数据的有效性
     */
    validateAttestationData(data) {
        return (data.status === 'complete' &&
            data.messageHash.length === 66 && // 0x + 64字符
            data.messageBytes.length > 0 &&
            data.attestation.length > 0);
    }
    /**
     * 获取attestation状态（不等待完成）
     */
    async checkAttestationStatus(messageHash) {
        try {
            const response = await fetch(`${CIRCLE_API_CONFIG.baseUrl}/v1/attestations/${messageHash}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });
            if (response.status === 404) {
                return {
                    status: 'pending',
                    messageHash,
                    messageBytes: '',
                    attestation: ''
                };
            }
            if (!response.ok) {
                throw new Error(`Circle API错误: ${response.status}`);
            }
            const data = await response.json();
            return {
                status: data.status,
                messageHash,
                messageBytes: data.message || '',
                attestation: data.attestation || ''
            };
        }
        catch (error) {
            console.error('检查attestation状态失败:', error);
            throw error;
        }
    }
    /**
     * 工具函数：睡眠指定毫秒数
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 计算预估等待时间
     */
    getEstimatedWaitTime() {
        return '通常需要1-3分钟，最多等待5分钟';
    }
}
exports.CircleAttestationService = CircleAttestationService;
// 导出单例实例
exports.circleAttestationService = new CircleAttestationService();
//# sourceMappingURL=circle-attestation.js.map