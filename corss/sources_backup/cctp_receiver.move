module cross_chain::cctp_receiver {
    use std::signer;

    // 引入本地配置模块
    use cross_chain::cctp_config;

    // 引入Circle官方CCTP模块
    // 根据all.md文档中的包地址
    // TODO: 暂时注释掉外部依赖，专注于 hyperion_liquidity 开发
    // use 0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9::message_transmitter;
    // use 0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9::token_messenger_minter;

    // 错误码定义
    const E_INVALID_MESSAGE: u64 = 1;
    const E_INVALID_ATTESTATION: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_MESSAGE_ALREADY_PROCESSED: u64 = 4;
    const E_INVALID_DOMAIN: u64 = 5;

    /// CCTP接收完成事件
    struct CCTPReceiveEvent has drop, store {
        recipient: address,           // 接收者地址
        amount: u64,                  // 接收的USDC数量
        source_domain: u32,           // 源链域ID
        message_hash: vector<u8>,     // 消息哈希
    }

    /// 接收从Base链发送的CCTP消息并铸造USDC
    /// @param account: 接收USDC的用户账户
    /// @param message_bytes: 从Base链生成的跨链消息
    /// @param attestation: Circle提供的签名证明
    public entry fun receive_cctp_usdc(
        account: &signer,
        message_bytes: vector<u8>,
        attestation: vector<u8>
    ) {
        let recipient_addr = signer::address_of(account);

        // 基础验证：消息和签名不能为空
        assert!(!std::vector::is_empty(&message_bytes), E_INVALID_MESSAGE);
        assert!(!std::vector::is_empty(&attestation), E_INVALID_ATTESTATION);

        // 验证地址格式有效性
        assert!(validate_aptos_address(recipient_addr), E_UNAUTHORIZED);

        // TODO: 实际的 CCTP 调用逻辑
        // 第一步：验证消息并获取Receipt
        // 这会验证Circle的签名、nonce防重放、以及消息的有效性
        // let receipt = message_transmitter::receive_message(message_bytes, attestation);

        // 第二步：处理Receipt并铸造USDC到用户账户
        // 这必须在同一个交易中完成，否则Receipt会失效
        // Circle的合约会自动将USDC铸造到消息中指定的接收地址
        // token_messenger_minter::handle_receive_message(receipt);
        
        // 暂时的占位符实现
        let _ = message_bytes;
        let _ = attestation;

        // TODO: 发出接收完成事件（暂时移除，专注核心功能）
        // 接收成功的标记通过函数执行成功来体现

        // 注意：根据Circle文档，Receipt会在handle_receive_message中自动销毁
        // 确保消息不会被重复处理，nonce也会被标记为已使用
    }

    /// 接收CCTP消息并添加流动性（预留功能）
    /// 这个函数将在后续实现流动性功能时使用
    /// @param account: 用户账户
    /// @param message_bytes: 跨链消息
    /// @param attestation: Circle签名
    /// @param pool_address: 流动性池地址（预留参数）
    /// @param liquidity_amount: 添加的流动性数量（预留参数）
    public entry fun receive_cctp_and_add_liquidity(
        account: &signer,
        message_bytes: vector<u8>,
        attestation: vector<u8>,
        pool_address: address,
        liquidity_amount: u64
    ) {
        // 首先完成CCTP USDC接收
        receive_cctp_usdc(account, message_bytes, attestation);

        // TODO: 在这里添加流动性逻辑
        // 这部分将在后续实现具体的DEX集成时完成

        // 预留参数使用（避免编译警告）
        let _ = pool_address;
        let _ = liquidity_amount;
    }

    /// 查询函数：检查消息是否已经被处理
    /// @param message_hash: 消息的哈希值
    /// @return: 如果消息已处理返回true
    public fun is_message_processed(_message_hash: vector<u8>): bool {
        // TODO: 调用Circle的MessageTransmitter查询函数
        // message_transmitter::is_nonce_used(message_hash)
        false // 占位符返回值
    }

    /// 工具函数：验证Aptos地址格式
    /// @param addr: 要验证的地址
    /// @return: 地址是否有效
    public fun validate_aptos_address(addr: address): bool {
        // 基本的地址验证
        // Aptos地址应该是32字节（64个十六进制字符）
        addr != @0x0
    }
}