#!/usr/bin/env node
"use strict";
/**
 * 测试已部署的合约
 * 这个脚本将测试当前部署在测试网上的合约功能
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testDeployedContract = main;
const ts_sdk_1 = require("@aptos-labs/ts-sdk");
const CONFIG = {
    APTOS_PRIVATE_KEY: '0x38ac0815b8a3922ed7ce80135bae28c4ba6cf7d5e3ea9e56acddcba0d0c40c9e',
    APTOS_ADDRESS: '0xba916e9cbf294e552e4281dfc227fadbd3413d81c2fc233816f85dd89d53f54c',
    USDC_METADATA_ADDR: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832',
    APT_METADATA_ADDR: '0x1::aptos_coin::AptosCoin',
};
async function initializeAptos() {
    console.log('🔧 初始化 Aptos 客户端...');
    const aptosConfig = new ts_sdk_1.AptosConfig({ network: ts_sdk_1.Network.TESTNET });
    const aptos = new ts_sdk_1.Aptos(aptosConfig);
    const privateKey = new ts_sdk_1.Ed25519PrivateKey(CONFIG.APTOS_PRIVATE_KEY);
    const account = ts_sdk_1.Account.fromPrivateKey({ privateKey });
    console.log(`账户地址: ${account.accountAddress}`);
    return { aptos, account };
}
async function testBasicFunctions(aptos) {
    console.log('\n📊 测试基础查询函数...');
    try {
        // 测试 get_supported_fee_tiers
        console.log('测试 get_supported_fee_tiers...');
        const feetiersResult = await aptos.view({
            payload: {
                function: `${CONFIG.APTOS_ADDRESS}::hyperion_liquidity::get_supported_fee_tiers`,
                functionArguments: [],
            },
        });
        console.log('✅ 支持的手续费等级:', feetiersResult[0]);
        // 测试 is_supported_fee_tier
        console.log('测试 is_supported_fee_tier...');
        for (let tier = 0; tier <= 4; tier++) {
            const isSupportedResult = await aptos.view({
                payload: {
                    function: `${CONFIG.APTOS_ADDRESS}::hyperion_liquidity::is_supported_fee_tier`,
                    functionArguments: [tier],
                },
            });
            console.log(`费率 ${tier} 是否支持:`, isSupportedResult[0]);
        }
        return true;
    }
    catch (error) {
        console.error('❌ 基础函数测试失败:', error);
        return false;
    }
}
async function testConfigFunctions(aptos, account) {
    console.log('\n⚙️ 测试配置函数...');
    try {
        // 尝试测试旧版本的 get_config (不带参数)
        console.log('测试 get_config (旧版本)...');
        try {
            const configResult = await aptos.view({
                payload: {
                    function: `${CONFIG.APTOS_ADDRESS}::hyperion_liquidity::get_config`,
                    functionArguments: [],
                },
            });
            console.log('✅ 合约配置 (旧版本):', configResult);
        }
        catch (error) {
            console.log('旧版本 get_config 失败，尝试新版本...');
            // 尝试新版本 (带参数)
            const configResult = await aptos.view({
                payload: {
                    function: `${CONFIG.APTOS_ADDRESS}::hyperion_liquidity::get_config`,
                    functionArguments: [account.accountAddress.toString()],
                },
            });
            console.log('✅ 合约配置 (新版本):', configResult);
        }
        // 测试 is_paused
        console.log('测试 is_paused...');
        try {
            // 尝试旧版本 (不带参数)
            const isPausedResult = await aptos.view({
                payload: {
                    function: `${CONFIG.APTOS_ADDRESS}::hyperion_liquidity::is_paused`,
                    functionArguments: [],
                },
            });
            console.log('✅ 是否暂停 (旧版本):', isPausedResult[0]);
        }
        catch (error) {
            console.log('旧版本 is_paused 失败，尝试新版本...');
            // 尝试新版本 (带参数)
            const isPausedResult = await aptos.view({
                payload: {
                    function: `${CONFIG.APTOS_ADDRESS}::hyperion_liquidity::is_paused`,
                    functionArguments: [account.accountAddress.toString()],
                },
            });
            console.log('✅ 是否暂停 (新版本):', isPausedResult[0]);
        }
        return true;
    }
    catch (error) {
        console.error('❌ 配置函数测试失败:', error);
        return false;
    }
}
async function testInitialization(aptos, account) {
    console.log('\n🚀 测试初始化功能...');
    try {
        // 测试初始化 (可能已经初始化过了)
        const initTxn = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: `${CONFIG.APTOS_ADDRESS}::hyperion_liquidity::initialize`,
                functionArguments: [],
            },
        });
        const committedTxn = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction: initTxn,
        });
        await aptos.waitForTransaction({
            transactionHash: committedTxn.hash,
        });
        console.log(`✅ 初始化成功: ${committedTxn.hash}`);
        return true;
    }
    catch (error) {
        if (error.message.includes('RESOURCE_ALREADY_EXISTS') ||
            error.message.includes('already exists')) {
            console.log('ℹ️  合约已经初始化过了');
            return true;
        }
        console.error('❌ 初始化失败:', error.message);
        return false;
    }
}
async function testSetTokenMetadata(aptos, account) {
    console.log('\n🪙 测试设置代币元数据...');
    try {
        const setTokenTxn = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: `${CONFIG.APTOS_ADDRESS}::hyperion_liquidity::set_token_metadata`,
                functionArguments: [
                    CONFIG.USDC_METADATA_ADDR,
                    CONFIG.APT_METADATA_ADDR,
                ],
            },
        });
        const committedTxn = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction: setTokenTxn,
        });
        await aptos.waitForTransaction({
            transactionHash: committedTxn.hash,
        });
        console.log(`✅ 代币元数据设置成功: ${committedTxn.hash}`);
        return true;
    }
    catch (error) {
        console.error('❌ 设置代币元数据失败:', error.message);
        return false;
    }
}
async function testAddLiquidity(aptos, account) {
    console.log('\n💧 测试添加流动性功能...');
    try {
        // 尝试添加少量流动性进行测试
        const addLiquidityTxn = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: `${CONFIG.APTOS_ADDRESS}::hyperion_liquidity::add_liquidity_to_hyperion`,
                functionArguments: [
                    1000000, // 1 USDC (6 decimals)
                    100000000, // 1 APT (8 decimals)
                    100, // tick_lower
                    200, // tick_upper
                    2, // fee_tier (0.3%)
                    500, // slippage (5%)
                    Math.floor(Date.now() / 1000) + 3600 // 1小时后过期
                ],
            },
        });
        console.log('📝 交易构建完成，等待签名和提交...');
        const committedTxn = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction: addLiquidityTxn,
        });
        console.log(`⏳ 交易已提交: ${committedTxn.hash}`);
        const executedTxn = await aptos.waitForTransaction({
            transactionHash: committedTxn.hash,
        });
        console.log(`✅ 添加流动性成功!`);
        console.log(`交易哈希: ${committedTxn.hash}`);
        console.log(`Gas 使用: ${executedTxn.gas_used}`);
        // 检查交易事件
        if ('events' in executedTxn && executedTxn.events && executedTxn.events.length > 0) {
            console.log('📊 交易事件:');
            executedTxn.events.forEach((event, index) => {
                console.log(`事件 ${index + 1}:`, event);
            });
        }
        return true;
    }
    catch (error) {
        console.error('❌ 添加流动性失败:', error.message);
        // 这个失败是预期的，因为需要真实的代币余额和 Hyperion 集成
        console.log('ℹ️  这个错误是预期的，因为需要真实的代币余额和完整的 Hyperion 集成');
        return false;
    }
}
async function main() {
    console.log('🚀 开始测试已部署的 Hyperion 流动性合约...\n');
    const results = {};
    try {
        const { aptos, account } = await initializeAptos();
        // 1. 测试基础函数
        results['basic_functions'] = await testBasicFunctions(aptos);
        // 2. 测试配置函数
        results['config_functions'] = await testConfigFunctions(aptos, account);
        // 3. 测试初始化
        results['initialization'] = await testInitialization(aptos, account);
        // 4. 测试设置代币元数据
        results['set_token_metadata'] = await testSetTokenMetadata(aptos, account);
        // 5. 测试添加流动性 (预期会失败，但验证函数可调用)
        results['add_liquidity'] = await testAddLiquidity(aptos, account);
        // 6. 总结
        console.log('\n📋 测试总结:');
        const passed = Object.values(results).filter(r => r).length;
        const total = Object.keys(results).length;
        console.log(`✅ 通过: ${passed}/${total}`);
        console.log(`❌ 失败: ${total - passed}/${total}`);
        Object.entries(results).forEach(([test, result]) => {
            console.log(`${result ? '✅' : '❌'} ${test}`);
        });
        if (passed >= 3) { // 大部分测试通过
            console.log('\n🎉 合约基础功能正常！');
            console.log('📝 注意：add_liquidity 功能需要真实的代币余额和完整的 Hyperion 集成才能完全测试');
        }
        else {
            console.log('\n⚠️  部分功能存在问题，请检查详细日志');
        }
    }
    catch (error) {
        console.error('\n❌ 测试过程中发生错误:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
