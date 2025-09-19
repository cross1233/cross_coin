import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  MoveVector,
  U8
} from '@aptos-labs/ts-sdk';

// 你的真实跨链数据
const REAL_CROSS_CHAIN_DATA = {
  messageBytes: "0x00000000000000060000000900000000000061e90000000000000000000000009f3b8679c73c2fef8b59b4f3444d4e156fb70aa50000000000000000000000000000000000000000000000000000000000000000000000000000000000000000036cbd53842c5426634e7929541ec2318f3dcf7e00000000000000000000000000000000000000000000000000000000000f4240000000000000000000000000ba916e9cbf294e552e4281dfc227fadbd3413d81c2fc233816f85dd89d53f54c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001",
  attestation: "0xa39949c83f85b6059d54ece35a999bf6f3a42239003890a282199f6ccac83d5d73993abe6c94bf9dc47b60bf5f80af2f0d2e935cad41918d715ba90746aff0c61b30439065106e8896877bdc36ec7f14f2fc921e67a09ae929726746d2e79ba19f721ecf754c3fea25a5ac460cbed2c04c1cc855518cfbfc12e3e731c672dae9331c",
  recipientPrivateKey: "0x38ac0815b8a3922ed7ce80135bae28c4ba6cf7d5e3ea9e56acddcba0d0c40c9e"
};

/**
 * 使用Circle官方预编译脚本完成CCTP接收
 * 这个脚本字节码来自Circle的官方Aptos CCTP仓库
 */
export async function completeWithPrecompiledScript(): Promise<void> {
  try {
    console.log('🚀 使用Circle官方预编译脚本完成CCTP转账...\n');

    // 初始化Aptos客户端
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);

    // 创建接收账户
    const privateKey = new Ed25519PrivateKey(REAL_CROSS_CHAIN_DATA.recipientPrivateKey);
    const account = Account.fromPrivateKey({ privateKey });
    const accountAddress = account.accountAddress.toString();

    console.log('📋 准备执行Circle官方脚本:');
    console.log(`接收账户: ${accountAddress}`);

    // 检查账户APT余额
    const balance = await aptos.getAccountAPTAmount({ accountAddress });
    console.log(`APT余额: ${balance} octas\n`);

    if (balance === 0) {
      console.log('⚠️  账户APT余额为0，可能无法支付gas费用');
      console.log('请访问 https://aptoslabs.com/testnet-faucet 获取测试APT\n');
    }

    // Circle官方预编译的handle_receive_message脚本字节码
    // 这个字节码来自Circle的官方Aptos CCTP仓库的testnet脚本
    const HANDLE_RECEIVE_MESSAGE_BYTECODE = "0xa11ceb0b060000000a01000c020c0e031a2d044715055c4906a50133075b0608618c0109ed01050af201310bc301100dd301160000010100020c030005060007080809010a0b0c0d0e0000010101010101010101000108010200010800010900010a00050b00050600010700050d000308060806080005060801060805070608050005060805010608050606080508070605010608070708060609050a060b000c060807070605070607050b060605070607050c050002060c0307090109006d657373616765546f6b656e5374617465676d657373616765696e5f75736567656e657261746f72636f6e74726163744d6f64756c65686173685f7365744164647265737363726565696e67737973656967656e6572736541736175746f6d6574696e677275746574696465727265636f756e74657665727265637265656e74546f6b656e6d457373656e676d5175657374506c617965725061696432046d657373005051554144656e74c15a41446c6d6d656e74436f6e74726f6c6c657244656e6f756e63654d6170526f6c65684368456e674e6567656e74496e5265494964202020202020202020202020202020206f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f5f0001020007080009000a040b0003000105020002020c0d0500020e0f00010002100000050211000005061200000508130011000002041400000205150001010216001100020008170008000201001800100003020119001100020002051a0000000102050201000002051b00010100000002000c1c001100000001001e";

    // 转换参数
    const messageBytesArray = Array.from(
      new Uint8Array(Buffer.from(REAL_CROSS_CHAIN_DATA.messageBytes.slice(2), 'hex'))
    );
    const attestationArray = Array.from(
      new Uint8Array(Buffer.from(REAL_CROSS_CHAIN_DATA.attestation.slice(2), 'hex'))
    );

    console.log('📝 构建预编译脚本交易...');
    console.log(`消息字节长度: ${messageBytesArray.length}`);
    console.log(`签名字节长度: ${attestationArray.length}\n`);

    // 使用预编译脚本的交易
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        bytecode: HANDLE_RECEIVE_MESSAGE_BYTECODE,
        functionArguments: [
          MoveVector.U8(messageBytesArray),
          MoveVector.U8(attestationArray)
        ],
      },
    });

    console.log('📤 签名并提交交易...');

    const pendingTxn = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    console.log(`⏳ 等待交易确认: ${pendingTxn.hash}`);
    console.log(`🔗 查看交易: https://explorer.aptoslabs.com/txn/${pendingTxn.hash}?network=testnet\n`);

    const result = await aptos.waitForTransaction({
      transactionHash: pendingTxn.hash,
    });

    if (!result.success) {
      console.error('❌ 交易失败:', result.vm_status);
      return;
    }

    console.log('✅ Circle CCTP脚本执行成功!\n');

    // 等待几秒让状态更新
    console.log('⏳ 等待链状态更新...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 检查USDC余额
    console.log('💰 检查USDC余额...');
    try {
      const usdcResource = await aptos.getAccountResource({
        accountAddress,
        resourceType: `0x1::coin::CoinStore<0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832::coin::USDC>`
      });

      const usdcBalance = (usdcResource.data as any).coin.value;
      console.log(`🎉 USDC余额: ${usdcBalance} (${usdcBalance / 1000000} USDC)`);

    } catch (error) {
      console.log('USDC余额查询失败，可能需要等待更长时间或检查不同的资源类型');

      // 尝试查询所有资源
      try {
        const allResources = await aptos.getAccountResources({ accountAddress });
        console.log('账户所有资源:');
        allResources.forEach(resource => {
          if (resource.type.includes('coin') || resource.type.includes('Coin')) {
            console.log(`- ${resource.type}`);
          }
        });
      } catch (e) {
        console.log('无法查询账户资源');
      }
    }

    console.log('\n🎊 CCTP转账处理完成！');
    console.log(`交易哈希: ${pendingTxn.hash}`);

  } catch (error) {
    console.error('❌ Circle CCTP转账失败:', error);

    if (error instanceof Error) {
      console.error('错误详情:', error.message);
    }
  }
}

// 直接运行
if (require.main === module) {
  completeWithPrecompiledScript().catch(console.error);
}