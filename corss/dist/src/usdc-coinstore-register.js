"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUSDCCoinStore = ensureUSDCCoinStore;
exports.checkUSDCBalance = checkUSDCBalance;
const ts_sdk_1 = require("@aptos-labs/ts-sdk");
// Circle官方USDC地址（Aptos Testnet）
const USDC_ADDRESS = "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832";
/**
 * 检查账户是否已注册USDC CoinStore
 */
async function checkUSDCCoinStore(aptos, accountAddress) {
    try {
        await aptos.getAccountResource({
            accountAddress: accountAddress,
            resourceType: `0x1::coin::CoinStore<${USDC_ADDRESS}::coin::USDC>`
        });
        return true; // 资源存在
    }
    catch (error) {
        if (error.status === 404) {
            return false; // 资源不存在，需要注册
        }
        throw error; // 其他错误
    }
}
/**
 * 注册USDC CoinStore
 */
async function registerUSDCCoinStore(aptos, account) {
    console.log('🔄 注册USDC CoinStore...');
    try {
        // 构建注册交易 - 使用coin::register而不是managed_coin::register
        const transaction = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: "0x1::coin::register",
                typeArguments: [`${USDC_ADDRESS}::coin::USDC`],
                functionArguments: [],
            },
        });
        console.log('📤 提交注册交易...');
        // 签名并提交交易
        const pendingTxn = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction,
        });
        console.log(`交易哈希: ${pendingTxn.hash}`);
        console.log('⏳ 等待交易确认...');
        // 等待交易确认
        const txnResult = await aptos.waitForTransaction({
            transactionHash: pendingTxn.hash,
        });
        if (!txnResult.success) {
            throw new Error(`注册失败: ${txnResult.vm_status}`);
        }
        console.log('✅ USDC CoinStore注册成功!');
        return pendingTxn.hash;
    }
    catch (error) {
        console.error('❌ 注册失败:', error);
        throw error;
    }
}
/**
 * 确保账户有USDC CoinStore（检查并注册）
 */
async function ensureUSDCCoinStore(accountAddress, privateKey) {
    console.log('🔍 检查USDC CoinStore状态...');
    console.log(`账户地址: ${accountAddress}`);
    const aptos = new ts_sdk_1.Aptos(new ts_sdk_1.AptosConfig({ network: ts_sdk_1.Network.TESTNET }));
    // 检查是否已经注册
    const hasStore = await checkUSDCCoinStore(aptos, accountAddress);
    if (hasStore) {
        console.log('✅ USDC CoinStore已存在，无需注册');
        return {
            registered: true,
            alreadyExists: true
        };
    }
    console.log('⚠️ USDC CoinStore不存在，开始注册...');
    // 创建账户并注册
    const account = ts_sdk_1.Account.fromPrivateKey({
        privateKey: new ts_sdk_1.Ed25519PrivateKey(privateKey)
    });
    const txHash = await registerUSDCCoinStore(aptos, account);
    // 验证注册成功
    const hasStoreAfter = await checkUSDCCoinStore(aptos, accountAddress);
    return {
        registered: hasStoreAfter,
        txHash: txHash,
        alreadyExists: false
    };
}
/**
 * 查询USDC余额（注册后）
 */
async function checkUSDCBalance(accountAddress) {
    const aptos = new ts_sdk_1.Aptos(new ts_sdk_1.AptosConfig({ network: ts_sdk_1.Network.TESTNET }));
    try {
        const resource = await aptos.getAccountResource({
            accountAddress: accountAddress,
            resourceType: `0x1::coin::CoinStore<${USDC_ADDRESS}::coin::USDC>`
        });
        return resource.data?.coin?.value || '0';
    }
    catch (error) {
        console.log('USDC余额查询失败，可能需要先注册CoinStore');
        return '0';
    }
}
//# sourceMappingURL=usdc-coinstore-register.js.map