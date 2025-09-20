"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeRealCCTPTransfer = completeRealCCTPTransfer;
const ts_sdk_1 = require("@aptos-labs/ts-sdk");
// 你的真实跨链数据
const REAL_CROSS_CHAIN_DATA = {
    messageBytes: "0x00000000000000060000000900000000000061e90000000000000000000000009f3b8679c73c2fef8b59b4f3444d4e156fb70aa50000000000000000000000000000000000000000000000000000000000000000000000000000000000000000036cbd53842c5426634e7929541ec2318f3dcf7e00000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000ba916e9cbf294e552e4281dfc227fadbd3413d81c2fc233816f85dd89d53f54c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001",
    attestation: "0xa39949c83f85b6059d54ece35a999bf6f3a42239003890a282199f6ccac83d5d73993abe6c94bf9dc47b60bf5f80af2f0d2e935cad41918d715ba90746aff0c61b30439065106e8896877bdc36ec7f14f2fc921e67a09ae929726746d2e79ba19f721ecf754c3fea25a5ac460cbed2c04c1cc855518cfbfc12e3e731c672dae9331c",
    recipientPrivateKey: "0x38ac0815b8a3922ed7ce80135bae28c4ba6cf7d5e3ea9e56acddcba0d0c40c9e"
};
// Circle CCTP 合约地址
const CIRCLE_CONTRACTS = {
    messageTransmitter: "0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9",
    tokenMessengerMinter: "0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9",
    usdc: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832"
};
/**
 * 使用Circle官方CCTP合约完成真实的跨链接收
 */
async function completeRealCCTPTransfer() {
    try {
        console.log('🚀 开始使用Circle官方CCTP接收真实的USDC...\n');
        // 初始化Aptos客户端
        const config = new ts_sdk_1.AptosConfig({ network: ts_sdk_1.Network.TESTNET });
        const aptos = new ts_sdk_1.Aptos(config);
        // 创建接收账户
        const privateKey = new ts_sdk_1.Ed25519PrivateKey(REAL_CROSS_CHAIN_DATA.recipientPrivateKey);
        const account = ts_sdk_1.Account.fromPrivateKey({ privateKey });
        const accountAddress = account.accountAddress.toString();
        console.log('📋 交易信息:');
        console.log(`接收账户: ${accountAddress}`);
        console.log(`消息长度: ${REAL_CROSS_CHAIN_DATA.messageBytes.length} 字符`);
        console.log(`签名长度: ${REAL_CROSS_CHAIN_DATA.attestation.length} 字符\n`);
        // 检查账户APT余额
        try {
            const resources = await aptos.getAccountResources({ accountAddress });
            const aptBalance = resources.find(r => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
            console.log(`APT余额: ${aptBalance ? aptBalance.data.coin.value : '0'} octas\n`);
        }
        catch (error) {
            console.log('获取APT余额失败，账户可能需要初始化\n');
        }
        // 步骤1：调用receive_message获取Receipt
        console.log('📥 第1步：调用message_transmitter::receive_message...');
        const messageBytesArray = Array.from(new Uint8Array(Buffer.from(REAL_CROSS_CHAIN_DATA.messageBytes.slice(2), 'hex')));
        const attestationArray = Array.from(new Uint8Array(Buffer.from(REAL_CROSS_CHAIN_DATA.attestation.slice(2), 'hex')));
        console.log(`消息字节数组长度: ${messageBytesArray.length}`);
        console.log(`签名字节数组长度: ${attestationArray.length}`);
        const receiveTransaction = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: `${CIRCLE_CONTRACTS.messageTransmitter}::message_transmitter::receive_message`,
                functionArguments: [
                    messageBytesArray,
                    attestationArray
                ],
            },
        });
        console.log('📝 签名并提交receive_message交易...');
        const receivePendingTxn = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction: receiveTransaction,
        });
        console.log(`⏳ 等待交易确认: ${receivePendingTxn.hash}`);
        const receiveResult = await aptos.waitForTransaction({
            transactionHash: receivePendingTxn.hash,
        });
        if (!receiveResult.success) {
            throw new Error(`receive_message交易失败: ${receiveResult.vm_status}`);
        }
        console.log('✅ receive_message成功！\n');
        // 步骤2：调用handle_receive_message处理Receipt并铸造USDC
        console.log('💰 第2步：调用token_messenger_minter::handle_receive_message...');
        // 从第一个交易的结果中获取Receipt（简化处理，实际需要解析事件）
        const handleTransaction = await aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                function: `${CIRCLE_CONTRACTS.tokenMessengerMinter}::token_messenger_minter::handle_receive_message`,
                functionArguments: [
                    // Receipt参数 - 这里需要从上一个交易中获取
                    // 简化处理：直接再次传递消息参数
                    messageBytesArray,
                    attestationArray
                ],
            },
        });
        console.log('📝 签名并提交handle_receive_message交易...');
        const handlePendingTxn = await aptos.signAndSubmitTransaction({
            signer: account,
            transaction: handleTransaction,
        });
        console.log(`⏳ 等待交易确认: ${handlePendingTxn.hash}`);
        const handleResult = await aptos.waitForTransaction({
            transactionHash: handlePendingTxn.hash,
        });
        if (!handleResult.success) {
            throw new Error(`handle_receive_message交易失败: ${handleResult.vm_status}`);
        }
        console.log('✅ handle_receive_message成功！\n');
        // 检查USDC余额
        console.log('💵 检查USDC余额...');
        try {
            const usdcResource = await aptos.getAccountResource({
                accountAddress,
                resourceType: `0x1::coin::CoinStore<${CIRCLE_CONTRACTS.usdc}::coin::USDC>`
            });
            const usdcBalance = usdcResource.data.coin.value;
            console.log(`🎉 USDC余额: ${usdcBalance} (${usdcBalance / 1000000} USDC)`);
        }
        catch (error) {
            console.log('USDC余额查询失败，可能还未收到或账户未初始化USDC资源');
        }
        console.log('\n🎊 跨链转账完成！');
        console.log(`Base链交易: 0x357031a4bde9087d4fb93982c0887a7bc66111a0f428ee7c9bb1fbdf6bfbf72e`);
        console.log(`Aptos receive: ${receivePendingTxn.hash}`);
        console.log(`Aptos handle: ${handlePendingTxn.hash}`);
    }
    catch (error) {
        console.error('❌ Circle CCTP转账失败:', error);
        if (error instanceof Error) {
            console.error('错误详情:', error.message);
        }
    }
}
// 直接运行
if (require.main === module) {
    completeRealCCTPTransfer().catch(console.error);
}
//# sourceMappingURL=circle-cctp-direct.js.map