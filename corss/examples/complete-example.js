#!/usr/bin/env node
"use strict";
/**
 * Base到Aptos CCTP跨链完整示例
 *
 * 使用前请确保：
 * 1. 在Base Sepolia测试网有USDC余额
 * 2. 有MetaMask等钱包用于Base链签名
 * 3. 有Aptos测试账户和私钥
 * 4. 网络连接正常
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const cross_chain_orchestrator_1 = require("../src/cross-chain-orchestrator");
const aptos_receiver_1 = require("../src/aptos-receiver");
// ============= 配置区域 =============
// ⚠️  请替换为你的实际参数
const CONFIG = {
    // Base链配置
    BASE_PRIVATE_KEY: '969c429a493c6c0782474798aa2c0fbc96847e05ce3ebe457486bb93b3d343d7', // 你的Base链私钥
    BASE_RPC_URL: 'https://sepolia.base.org',
    // Aptos配置
    APTOS_PRIVATE_KEY: '0x38ac0815b8a3922ed7ce80135bae28c4ba6cf7d5e3ea9e56acddcba0d0c40c9e', // 你的Aptos私钥
    APTOS_RECIPIENT: '0xba916e9cbf294e552e4281dfc227fadbd3413d81c2fc233816f85dd89d53f54c', // Aptos接收地址
    // 跨链参数
    USDC_AMOUNT: '1.0', // 跨链USDC数量（字符串格式）
};
/**
 * 主要的示例函数
 */
async function runCrossChainExample() {
    console.log('🚀 Base到Aptos CCTP跨链示例开始...\n');
    try {
        // ========== 1. 初始化签名器 ==========
        console.log('📋 初始化配置...');
        // 创建Base链签名器
        const baseProvider = new ethers_1.ethers.JsonRpcProvider(CONFIG.BASE_RPC_URL);
        const baseSigner = new ethers_1.ethers.Wallet(CONFIG.BASE_PRIVATE_KEY, baseProvider);
        const baseAddress = await baseSigner.getAddress();
        console.log(`Base链地址: ${baseAddress}`);
        console.log(`Aptos接收地址: ${CONFIG.APTOS_RECIPIENT}`);
        console.log(`跨链数量: ${CONFIG.USDC_AMOUNT} USDC\n`);
        // ========== 2. 前置条件检查 ==========
        console.log('🔍 检查前置条件...');
        const crossChainParams = {
            amount: CONFIG.USDC_AMOUNT,
            recipientAddress: CONFIG.APTOS_RECIPIENT,
            baseSigner: baseSigner,
            aptosPrivateKey: CONFIG.APTOS_PRIVATE_KEY,
            onProgress: (step, details) => {
                console.log(`📊 进度: ${step}`, details ? JSON.stringify(details, null, 2) : '');
            }
        };
        const prerequisites = await cross_chain_orchestrator_1.crossChainOrchestrator.checkPrerequisites(crossChainParams);
        if (!prerequisites.valid) {
            console.error('❌ 前置条件检查失败:');
            prerequisites.issues.forEach(issue => console.error(`  - ${issue}`));
            return;
        }
        console.log('✅ 前置条件检查通过\n');
        // ========== 3. 费用估算 ==========
        console.log('💰 估算跨链费用...');
        const costEstimate = await cross_chain_orchestrator_1.crossChainOrchestrator.estimateCrossChainCost();
        console.log('费用估算:', costEstimate);
        console.log('');
        // ========== 4. 执行跨链 ==========
        console.log('🎯 开始执行跨链转账...\n');
        const result = await cross_chain_orchestrator_1.crossChainOrchestrator.executeCrossChain(crossChainParams);
        // ========== 5. 结果输出 ==========
        console.log('\n📊 跨链结果:');
        console.log('='.repeat(50));
        if (result.success) {
            console.log('✅ 跨链转账成功!');
            console.log(`Base链交易: ${result.baseTxHash}`);
            console.log(`Aptos链交易: ${result.aptosTxHash}`);
            console.log(`最终收到USDC: ${result.finalUSDCAmount}`);
            // 显示详细步骤信息
            console.log('\n📋 详细步骤:');
            if (result.steps.baseBurn) {
                console.log(`  1. Base链烧毁: ${result.steps.baseBurn.txHash}`);
            }
            if (result.steps.attestation) {
                console.log(`  2. Circle签名: ${result.steps.attestation.messageHash}`);
            }
            if (result.steps.aptosReceive) {
                console.log(`  3. Aptos接收: ${result.steps.aptosReceive.txHash}`);
            }
        }
        else {
            console.log('❌ 跨链转账失败!');
            console.log(`错误: ${result.error}`);
            // 显示部分完成的步骤
            if (result.baseTxHash) {
                console.log(`Base链交易已完成: ${result.baseTxHash}`);
                console.log('⚠️  USDC已在Base链烧毁，请检查Aptos端问题');
            }
        }
    }
    catch (error) {
        console.error('💥 示例执行失败:', error);
    }
}
/**
 * 简单的余额查询示例
 */
async function checkBalancesExample() {
    console.log('💰 查询余额示例...\n');
    try {
        // 检查Base链USDC余额
        const baseProvider = new ethers_1.ethers.JsonRpcProvider(CONFIG.BASE_RPC_URL);
        const baseSigner = new ethers_1.ethers.Wallet(CONFIG.BASE_PRIVATE_KEY, baseProvider);
        const baseAddress = await baseSigner.getAddress();
        console.log(`Base链地址: ${baseAddress}`);
        // 这里需要实际的USDC余额查询逻辑
        console.log('Base USDC余额: [需要实现查询逻辑]');
        // 检查Aptos链USDC余额
        console.log(`Aptos地址: ${CONFIG.APTOS_RECIPIENT}`);
        const aptosBalance = await aptos_receiver_1.aptosCCTPReceiver.checkUSDCBalance(CONFIG.APTOS_RECIPIENT);
        console.log(`Aptos USDC余额: ${aptosBalance}`);
    }
    catch (error) {
        console.error('余额查询失败:', error);
    }
}
/**
 * 创建新Aptos测试账户示例
 */
function createAptosAccountExample() {
    console.log('🆕 创建Aptos测试账户...\n');
    const account = aptos_receiver_1.aptosCCTPReceiver.createTestAccount();
    console.log('⚠️  请保存以下信息：');
    console.log(`地址: ${account.accountAddress.toString()}`);
    console.log(`私钥: ${account.privateKey.toString()}`);
    console.log(`公钥: ${account.publicKey.toString()}`);
    console.log('\n💡 提示: 请到Aptos测试网faucet获取测试APT用于gas费用');
    console.log('Faucet地址: https://aptoslabs.com/testnet-faucet');
}
// ============= 主程序入口 =============
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    switch (command) {
        case 'cross-chain':
            await runCrossChainExample();
            break;
        case 'balance':
            await checkBalancesExample();
            break;
        case 'create-account':
            createAptosAccountExample();
            break;
        case 'help':
        default:
            console.log('📖 Base到Aptos CCTP跨链工具\n');
            console.log('使用方法:');
            console.log('  npm run example cross-chain    # 执行完整跨链流程');
            console.log('  npm run example balance        # 查询余额');
            console.log('  npm run example create-account # 创建Aptos测试账户');
            console.log('');
            console.log('⚠️  使用前请修改配置区域的参数');
            break;
    }
}
// 运行主程序
if (require.main === module) {
    main().catch(console.error);
}
//# sourceMappingURL=complete-example.js.map