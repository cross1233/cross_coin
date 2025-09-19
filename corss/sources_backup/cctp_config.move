module cross_chain::cctp_config {

    // Circle CCTP 配置常量
    // 基于all.md文档中的官方参数

    /// Base Sepolia 测试网域ID
    const BASE_SEPOLIA_DOMAIN_ID: u32 = 6;

    /// Aptos 测试网域ID
    const APTOS_DOMAIN_ID: u32 = 9;

    /// Circle官方包地址（Aptos测试网）
    /// MessageTransmitter包地址
    const MESSAGE_TRANSMITTER_PACKAGE: address = @0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9;

    /// TokenMessengerMinter包地址
    const TOKEN_MESSENGER_MINTER_PACKAGE: address = @0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9;

    /// Circle官方对象地址（Aptos测试网）
    /// MessageTransmitter对象地址
    const MESSAGE_TRANSMITTER_OBJECT: address = @0xcbb70e4f5d89b4a37e850c22d7c994e32c31e9cf693e9633784e482e9a879e0c;

    /// TokenMessengerMinter对象地址
    const TOKEN_MESSENGER_MINTER_OBJECT: address = @0x1fbf4458a00a842a4774f441fac7a41f2da0488dd93a43880e76d58789144e17;

    /// USDC对象地址（Aptos测试网）
    const USDC_OBJECT: address = @0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832;

    // 公开的getter函数

    /// 获取Base Sepolia域ID
    public fun get_base_domain_id(): u32 {
        BASE_SEPOLIA_DOMAIN_ID
    }

    /// 获取Aptos域ID
    public fun get_aptos_domain_id(): u32 {
        APTOS_DOMAIN_ID
    }

    /// 获取MessageTransmitter包地址
    public fun get_message_transmitter_package(): address {
        MESSAGE_TRANSMITTER_PACKAGE
    }

    /// 获取TokenMessengerMinter包地址
    public fun get_token_messenger_minter_package(): address {
        TOKEN_MESSENGER_MINTER_PACKAGE
    }

    /// 获取MessageTransmitter对象地址
    public fun get_message_transmitter_object(): address {
        MESSAGE_TRANSMITTER_OBJECT
    }

    /// 获取TokenMessengerMinter对象地址
    public fun get_token_messenger_minter_object(): address {
        TOKEN_MESSENGER_MINTER_OBJECT
    }

    /// 获取USDC对象地址
    public fun get_usdc_object(): address {
        USDC_OBJECT
    }

    /// 验证域ID是否为支持的链
    /// @param domain_id: 要验证的域ID
    /// @return: 是否为支持的域ID
    public fun is_supported_domain(domain_id: u32): bool {
        domain_id == BASE_SEPOLIA_DOMAIN_ID || domain_id == APTOS_DOMAIN_ID
    }

    /// 验证是否为跨链交易（源域和目标域不同）
    /// @param source_domain: 源链域ID
    /// @param destination_domain: 目标链域ID
    /// @return: 是否为有效的跨链交易
    public fun is_valid_cross_chain(source_domain: u32, destination_domain: u32): bool {
        source_domain != destination_domain &&
        is_supported_domain(source_domain) &&
        is_supported_domain(destination_domain)
    }
}