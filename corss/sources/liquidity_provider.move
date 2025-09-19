module cross_chain::liquidity_provider_v2 {
    use std::signer;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::primary_fungible_store;

    // 导入 Hyperion DEX 模块 - 使用正确的合约地址
    use 0x3673bee9e7b78ae63d4a9e3d58425bc97e7f3b8d68efc846ee732b14369333dd::router_v3;
    use 0x3673bee9e7b78ae63d4a9e3d58425bc97e7f3b8d68efc846ee732b14369333dd::pool_v3;
    use 0x3673bee9e7b78ae63d4a9e3d58425bc97e7f3b8d68efc846ee732b14369333dd::position_v3;

    // 常量定义
    const USDC_ADDRESS: address = @0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832;
    const FEE_TIER: u8 = 1;                     // 0.05% 费率
    const DEFAULT_SLIPPAGE: u64 = 5;            // 5% 默认滑点
    const DEFAULT_DEADLINE_SECONDS: u64 = 1800; // 30分钟默认期限
    const TICK_SPACING: u32 = 10;               // tick间距

    // 错误代码
    const E_INSUFFICIENT_USDC_BALANCE: u64 = 1001;
    const E_INSUFFICIENT_APT_BALANCE: u64 = 1002;
    const E_INVALID_AMOUNTS: u64 = 1003;
    const E_INVALID_TICK_RANGE: u64 = 1004;
    const E_DEADLINE_EXPIRED: u64 = 1005;
    const E_INVALID_SLIPPAGE: u64 = 1006;
    const E_POOL_CREATION_FAILED: u64 = 1007;
    const E_POSITION_CREATION_FAILED: u64 = 1008;

    // 事件定义
    #[event]
    struct LiquidityAddedEvent has drop, store {
        user: address,
        position_id: address,
        usdc_amount: u64,
        apt_amount: u64,
        liquidity_amount: u128,
        tick_lower: u32,
        tick_upper: u32,
        timestamp: u64
    }

    #[event]
    struct PoolCreatedEvent has drop, store {
        creator: address,
        usdc_token: address,
        apt_token: address,
        fee_tier: u8,
        initial_tick: u32,
        timestamp: u64
    }

    // 流动性添加参数结构
    struct LiquidityParams has copy, drop {
        usdc_amount: u64,
        apt_amount: u64,
        tick_lower: u32,
        tick_upper: u32,
        slippage_tolerance: u64,
        deadline: u64
    }

    /// 主要入口函数：为 USDC/APT 添加流动性
    /// @param user: 用户签名者
    /// @param usdc_amount: 期望添加的 USDC 数量 (需要是FungibleAsset标准)
    /// @param apt_amount: 期望添加的 APT 数量 (以octas为单位)
    /// @param tick_range_percent: 价格范围百分比 (例如: 20 表示 ±20%)
    public entry fun add_usdc_apt_liquidity(
        user: &signer,
        usdc_amount: u64,
        apt_amount: u64,
        tick_range_percent: u32
    ) {
        let user_addr = signer::address_of(user);

        // 预检查
        validate_inputs(user, usdc_amount, apt_amount);

        // 获取代币对象
        let usdc_token = object::address_to_object<Metadata>(@0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832);

        // 检查或创建池子
        ensure_pool_exists(user, usdc_token, tick_range_percent);

        // 计算价格范围
        let (tick_lower, tick_upper) = calculate_tick_range(usdc_token, tick_range_percent);

        // 创建流动性参数
        let params = LiquidityParams {
            usdc_amount,
            apt_amount,
            tick_lower,
            tick_upper,
            slippage_tolerance: DEFAULT_SLIPPAGE,
            deadline: timestamp::now_seconds() + DEFAULT_DEADLINE_SECONDS
        };

        // 执行添加流动性
        let position_addr = execute_add_liquidity(user, usdc_token, params);

        // 发出事件
        aptos_framework::event::emit(LiquidityAddedEvent {
            user: user_addr,
            position_id: position_addr,
            usdc_amount,
            apt_amount,
            liquidity_amount: 1000000, // 占位符值
            tick_lower,
            tick_upper,
            timestamp: timestamp::now_seconds()
        });
    }

    /// 验证输入参数
    fun validate_inputs(user: &signer, usdc_amount: u64, apt_amount: u64) {
        let user_addr = signer::address_of(user);

        // 检查数量有效性
        assert!(usdc_amount > 0 && apt_amount > 0, E_INVALID_AMOUNTS);

        // 检查 APT 余额
        let apt_balance = coin::balance<AptosCoin>(user_addr);
        assert!(apt_balance >= apt_amount, E_INSUFFICIENT_APT_BALANCE);

        // 检查 USDC 余额 (FungibleAsset)
        let usdc_token = object::address_to_object<Metadata>(@0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832);
        let usdc_balance = primary_fungible_store::balance(user_addr, usdc_token);
        assert!(usdc_balance >= usdc_amount, E_INSUFFICIENT_USDC_BALANCE);
    }

    /// 确保池子存在，如果不存在则创建
    fun ensure_pool_exists(
        user: &signer,
        usdc_token: Object<Metadata>,
        _tick_range_percent: u32
    ) {
        // 暂时跳过池子创建，因为池子可能已经存在
        // 在实际实现中，我们需要：
        // 1. 检查池子是否已经存在
        // 2. 如果不存在，则创建池子
        // 3. 使用 Hyperion 的 Coin 支持功能
        
        // 暂时跳过池子创建逻辑
        // router_v3::create_pool_coin<AptosCoin>(
        //     usdc_token,
        //     FEE_TIER,
        //     initial_tick
        // );

        // 发出池子创建事件（占位符）
        aptos_framework::event::emit(PoolCreatedEvent {
            creator: signer::address_of(user),
            usdc_token: object::object_address(&usdc_token),
            apt_token: @0x000000000000000000000000000000000000000000000000000000000000000a, // APT 的 FA Metadata 地址
            fee_tier: FEE_TIER,
            initial_tick: 0, // 占位符
            timestamp: timestamp::now_seconds()
        });
    }

    /// 执行添加流动性的核心逻辑
    /// 注意：当前Hyperion接口是placeholder实现，实际部署时需要使用真实的DEX合约
    fun execute_add_liquidity(
        user: &signer,
        usdc_token: Object<Metadata>,
        params: LiquidityParams
    ): address {

        // 验证deadline
        assert!(params.deadline > timestamp::now_seconds(), E_DEADLINE_EXPIRED);

        // 验证tick范围
        assert!(params.tick_lower < params.tick_upper, E_INVALID_TICK_RANGE);

        // 计算最小数量（滑点保护）
        let usdc_min = (params.usdc_amount * (100 - params.slippage_tolerance)) / 100;
        let apt_min = (params.apt_amount * (100 - params.slippage_tolerance)) / 100;

        // 验证滑点参数
        assert!(usdc_min <= params.usdc_amount, E_INVALID_SLIPPAGE);
        assert!(apt_min <= params.apt_amount, E_INVALID_SLIPPAGE);

        // 实现正确的 Hyperion 流动性添加逻辑
        
        // 1. 检查池子是否存在 - 使用正确的函数签名
        let pool_exists = pool_v3::liquidity_pool_exists(usdc_token, get_apt_metadata(), FEE_TIER);
        
        // 2. 如果池子不存在，创建池子
        if (!pool_exists) {
            let initial_tick = calculate_initial_tick();
            router_v3::create_pool_coin<AptosCoin>(
                usdc_token,
                FEE_TIER,
                initial_tick
            );
        };
        
        // 3. 使用 create_liquidity_coin 创建位置并添加流动性
        // 这个函数专门处理 Coin + FungibleAsset 的组合
        router_v3::create_liquidity_coin<AptosCoin>(
            user,
            usdc_token,
            FEE_TIER,
            params.tick_lower,
            params.tick_upper,
            calculate_initial_tick(),
            params.usdc_amount,  // USDC 数量
            params.apt_amount,   // APT 数量
            (params.usdc_amount * (100 - params.slippage_tolerance)) / 100,  // 最小 USDC
            (params.apt_amount * (100 - params.slippage_tolerance)) / 100,   // 最小 APT
            params.deadline
        );

        // 返回一个占位符地址，因为 create_liquidity_coin 不返回 position 对象
        @0x0
    }

    /// 计算tick价格范围
    fun calculate_tick_range(
        usdc_token: Object<Metadata>,
        range_percent: u32
    ): (u32, u32) {

        // 获取当前池子的实际价格
        let (current_tick, _) = if (is_pool_exists()) {
            pool_v3::current_tick_and_price(get_pool_address())
        } else {
            // 如果池子不存在，使用默认初始tick
            (calculate_initial_tick(), 0)
        };

        // 计算tick范围 (简化版本)
        // 每1%的价格变动大约对应200个tick (近似值)
        let tick_range = (range_percent * 200);

        let tick_lower = if (current_tick > tick_range) {
            current_tick - tick_range
        } else {
            0
        };
        let tick_upper = current_tick + tick_range;

        // 对齐到tick_spacing
        let aligned_tick_lower = (tick_lower / TICK_SPACING) * TICK_SPACING;
        let aligned_tick_upper = ((tick_upper + TICK_SPACING - 1) / TICK_SPACING) * TICK_SPACING;

        (aligned_tick_lower, aligned_tick_upper)
    }

    /// 计算初始tick (基于合理的USDC/APT价格)
    fun calculate_initial_tick(): u32 {
        // 假设初始价格: 1 APT ≈ 8-12 USDC (测试网合理价格)
        // 这需要转换为sqrt_price然后转换为tick
        // 简化实现，使用一个合理的中间值
        50000  // 这个值需要根据实际市场价格精确计算
    }

    /// 获取APT的Metadata对象
    /// 在 Hyperion 中，APT 使用对应的 FA Metadata Object
    fun get_apt_metadata(): Object<Metadata> {
        // APT 对应的 FA Metadata Object 地址
        object::address_to_object<Metadata>(@0x000000000000000000000000000000000000000000000000000000000000000a)
    }

    // 查看函数

    #[view]
    public fun is_pool_exists(): bool {
        // 使用正确的 USDC 和 APT Metadata 地址检查池子是否存在
        let usdc_metadata = object::address_to_object<Metadata>(@0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832);
        let apt_metadata = get_apt_metadata();
        pool_v3::liquidity_pool_exists(usdc_metadata, apt_metadata, FEE_TIER)
    }

    #[view]
    public fun get_pool_address(): address {
        // 使用正确的 USDC 和 APT Metadata 地址获取池子地址
        let usdc_metadata = object::address_to_object<Metadata>(@0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832);
        let apt_metadata = get_apt_metadata();
        pool_v3::liquidity_pool_address(usdc_metadata, apt_metadata, FEE_TIER)
    }

    #[view]
    public fun get_user_balances(user_addr: address): (u64, u64) {
        let apt_balance = coin::balance<AptosCoin>(user_addr);
        let usdc_token = object::address_to_object<Metadata>(@0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832);
        let usdc_balance = primary_fungible_store::balance(user_addr, usdc_token);
        (usdc_balance, apt_balance)
    }

    #[view]
    public fun get_pool_info(): (u32, u128) {
        if (is_pool_exists()) {
            let pool_addr = get_pool_address();
            pool_v3::current_tick_and_price(pool_addr)
        } else {
            (0, 0)
        }
    }

    #[view]
    public fun calculate_optimal_amounts(
        usdc_amount: u64,
        apt_amount: u64,
        tick_range_percent: u32
    ): (u128, u64, u64) {
        let usdc_token = object::address_to_object<Metadata>(@0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832);
        let (tick_lower, tick_upper) = calculate_tick_range(usdc_token, tick_range_percent);

        // 暂时返回占位符值，因为我们需要正确的 APT FungibleAsset Metadata
        // 在实际实现中，我们需要使用 Hyperion 的 Coin 支持功能
        (1000000, usdc_amount, apt_amount)
    }

    /// 智能计算最优的流动性添加参数
    /// 根据用户余额、池子状态、滑点等数据计算
    #[view]
    public fun calculate_smart_liquidity_params(
        user_addr: address,
        max_usdc_percent: u64,  // 最大使用USDC余额的百分比 (例如: 50 表示50%)
        max_apt_percent: u64,   // 最大使用APT余额的百分比
        tick_range_percent: u32 // 价格范围百分比
    ): (u64, u64, u32, u64) {
        // 获取用户余额
        let (usdc_balance, apt_balance) = get_user_balances(user_addr);
        
        // 计算最大可用数量
        let max_usdc = (usdc_balance * max_usdc_percent) / 100;
        let max_apt = (apt_balance * max_apt_percent) / 100;
        
        // 获取池子信息
        let (current_tick, current_price) = if (is_pool_exists()) {
            pool_v3::current_tick_and_price(get_pool_address())
        } else {
            (50000, 224699260982037790824) // 默认值
        };
        
        // 根据当前价格计算最优比例
        // 当前价格: 224699260982037790824 (约22.47 APT per USDC)
        // 这意味着 1 USDC ≈ 0.0445 APT
        
        // 计算基于当前价格的最优比例
        // 简化价格计算，使用固定比例
        // 当前价格约22.47，意味着1 USDC ≈ 0.0445 APT
        let optimal_apt_for_usdc = (max_usdc * 445) / 10000; // 0.0445 * 10000 = 445
        
        // 确保不超过用户余额
        let final_usdc = if (max_usdc < optimal_apt_for_usdc) {
            max_usdc
        } else {
            max_usdc
        };
        
        let final_apt = if (optimal_apt_for_usdc < max_apt) {
            optimal_apt_for_usdc
        } else {
            max_apt
        };
        
        // 计算滑点保护 (5%)
        let slippage_tolerance = 5;
        
        // 计算deadline (30分钟后)
        let deadline = timestamp::now_seconds() + 1800;
        
        (final_usdc, final_apt, tick_range_percent, deadline)
    }
}