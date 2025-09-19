# USDC/APT 添加流动性 MVP 技术方案

## 概述

本文档描述了基于 Hyperion DEX 测试网实现 USDC/APT 交易对添加流动性的最小可行产品(MVP)方案。该方案专注于核心功能的实现，确保用户能够成功向 USDC/APT 池子添加流动性。

## 基础信息

### 合约地址
- **测试网合约**: `0x3673bee9e7b78ae63d4a9e3d58425bc97e7f3b8d68efc846ee732b14369333dd`

### 代币信息
- **APT (Aptos Coin)**: `0x1::aptos_coin::AptosCoin`
- **USDC**: `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832`

### 核心模块
- **主要模块**: `dex_contract::router_v3`
- **函数类型**: `*_coin<AptosCoin>` 系列函数

## 技术架构

### 流动性管理策略
- **V3 集中流动性**: 支持指定价格区间的流动性提供
- **费率等级**: 使用 0.05% 费率 (fee_tier = 1)
- **Tick 间距**: 10 (对应 0.05% 费率等级)

### 头寸管理
- **头寸对象**: 通过 `Object<position_v3::Info>` 管理
- **价格范围**: 设置合理的 tick_lower 和 tick_upper
- **流动性计算**: 系统自动根据代币数量和价格范围计算

## 实现流程

### 1. 池子状态检查

```move
// 检查 USDC/APT 池子是否已存在
let pool_exists = dex_contract::pool_v3::liquidity_pool_exists(
    usdc_token,    // 0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832
    apt_token,     // 0x1::aptos_coin::AptosCoin
    1              // fee_tier: 0.05%
);
```

### 2. 创建池子 (如需要)

```move
// 如果池子不存在，创建新池子
dex_contract::router_v3::create_pool_coin<AptosCoin>(
    usdc_token,           // USDC FungibleAsset 地址
    1,                    // fee_tier: 0.05%
    tick_current          // 基于当前市场价格的 tick
);
```

### 3. 创建流动性头寸

```move
// 为用户创建新的流动性头寸
let position = dex_contract::router_v3::open_position_coin<AptosCoin>(
    &user,                // 用户签名者
    usdc_token,           // USDC 地址
    1,                    // fee_tier: 0.05%
    tick_lower,           // 价格下界 (建议: 当前价格 -20%)
    tick_upper,           // 价格上界 (建议: 当前价格 +20%)
    deadline              // 截止时间 (建议: 当前时间 + 30分钟)
);
```

### 4. 添加流动性

```move
// 向头寸添加 USDC 和 APT 流动性
dex_contract::router_v3::add_liquidity_coin<AptosCoin>(
    &user,                // 用户签名者
    position,             // 上步创建的头寸对象
    usdc_token,           // USDC 地址
    1,                    // fee_tier: 0.05%
    usdc_amount,          // 期望添加的 USDC 数量
    apt_amount,           // 期望添加的 APT 数量
    usdc_min,             // 最小 USDC 数量 (滑点保护: usdc_amount * 0.95)
    apt_min,              // 最小 APT 数量 (滑点保护: apt_amount * 0.95)
    deadline              // 交易截止时间
);
```

## 参数配置

### 费率等级设置
```move
const FEE_TIER: u8 = 1;                    // 0.05% 费率
const TICK_SPACING: u32 = 10;              // Tick 间距
const FEE_RATE: u64 = 500;                 // 500/1000000 = 0.05%
```

### 价格范围计算
```move
// 示例: 基于当前 tick 设置 ±20% 价格范围
let current_tick = get_current_tick();
let tick_range = 4000;                     // 约20%价格范围
let tick_lower = current_tick - tick_range;
let tick_upper = current_tick + tick_range;

// 确保 tick 对齐到 tick_spacing
tick_lower = (tick_lower / 10) * 10;
tick_upper = (tick_upper / 10) * 10;
```

### 滑点保护
```move
const SLIPPAGE_TOLERANCE: u64 = 5;         // 5% 滑点容忍度

let usdc_min = (usdc_amount * (100 - SLIPPAGE_TOLERANCE)) / 100;
let apt_min = (apt_amount * (100 - SLIPPAGE_TOLERANCE)) / 100;
```

### 时间设置
```move
use aptos_framework::timestamp;

let current_time = timestamp::now_seconds();
let deadline = current_time + 1800;        // 30分钟有效期
```

## 错误处理

### 常见错误码处理

| 错误码 | 描述 | 处理方案 |
|--------|------|----------|
| `EAMOUNT_A_TOO_LESS` | USDC 余额不足 | 检查用户 USDC 余额 |
| `EAMOUNT_B_TOO_LESS` | APT 余额不足 | 检查用户 APT 余额 |
| `EPOOL_NOT_EXISTS` | 池子不存在 | 先调用创建池子函数 |
| `EPOOL_LOCKED` | 池子被锁定 | 等待池子解锁后重试 |
| `ENOT_POSITION_OWNER` | 头寸所有权错误 | 确认头寸归属 |
| `ELIQUIDITY_NOT_IN_CURRENT_REGION` | 流动性不在当前区间 | 调整 tick 范围 |

### 预检查清单

```move
// 1. 余额检查
let user_usdc_balance = /* 获取用户 USDC 余额 */;
let user_apt_balance = /* 获取用户 APT 余额 */;
assert!(user_usdc_balance >= usdc_amount, INSUFFICIENT_USDC_BALANCE);
assert!(user_apt_balance >= apt_amount, INSUFFICIENT_APT_BALANCE);

// 2. 参数验证
assert!(tick_lower < tick_upper, INVALID_TICK_RANGE);
assert!(deadline > timestamp::now_seconds(), DEADLINE_EXPIRED);
assert!(usdc_amount > 0 && apt_amount > 0, INVALID_AMOUNTS);

// 3. 滑点检查
assert!(usdc_min <= usdc_amount, INVALID_SLIPPAGE);
assert!(apt_min <= apt_amount, INVALID_SLIPPAGE);
```

## 使用示例

### 完整的添加流动性流程

```move
module liquidity_provider {
    use dex_contract::router_v3;
    use dex_contract::pool_v3;
    use aptos_framework::timestamp;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::fungible_asset::Metadata;

    // 常量定义
    const USDC_ADDRESS: address = @0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832;
    const FEE_TIER: u8 = 1;
    const SLIPPAGE_TOLERANCE: u64 = 5;

    public entry fun add_usdc_apt_liquidity(
        user: &signer,
        usdc_amount: u64,
        apt_amount: u64,
        tick_range_percent: u32
    ) {
        // 获取代币对象
        let usdc_token = object::address_to_object<Metadata>(USDC_ADDRESS);
        let apt_token = object::address_to_object<Metadata>(@0x1);

        // 检查池子是否存在
        let pool_exists = pool_v3::liquidity_pool_exists(usdc_token, apt_token, FEE_TIER);

        if (!pool_exists) {
            // 创建池子 (需要合适的初始价格)
            let initial_tick = calculate_initial_tick();
            router_v3::create_pool_coin<aptos_coin::AptosCoin>(usdc_token, FEE_TIER, initial_tick);
        };

        // 计算价格范围
        let (tick_lower, tick_upper) = calculate_tick_range(tick_range_percent);

        // 创建头寸
        let deadline = timestamp::now_seconds() + 1800; // 30分钟
        let position = router_v3::open_position_coin<aptos_coin::AptosCoin>(
            user, usdc_token, FEE_TIER, tick_lower, tick_upper, deadline
        );

        // 计算最小数量 (滑点保护)
        let usdc_min = (usdc_amount * (100 - SLIPPAGE_TOLERANCE)) / 100;
        let apt_min = (apt_amount * (100 - SLIPPAGE_TOLERANCE)) / 100;

        // 添加流动性
        router_v3::add_liquidity_coin<aptos_coin::AptosCoin>(
            user,
            position,
            usdc_token,
            FEE_TIER,
            usdc_amount,
            apt_amount,
            usdc_min,
            apt_min,
            deadline
        );
    }

    // 计算合理的 tick 范围
    fun calculate_tick_range(range_percent: u32): (u32, u32) {
        // 获取当前池子的 tick
        let current_tick = /* 实现获取当前 tick 的逻辑 */;
        let tick_range = (range_percent * 200) / 100; // 简化计算

        let tick_lower = current_tick - tick_range;
        let tick_upper = current_tick + tick_range;

        // 对齐到 tick_spacing (10)
        tick_lower = (tick_lower / 10) * 10;
        tick_upper = (tick_upper / 10) * 10;

        (tick_lower, tick_upper)
    }

    // 计算初始 tick (基于当前市场价格)
    fun calculate_initial_tick(): u32 {
        // 这里需要根据实际的 USDC/APT 市场价格来计算
        // 示例: 假设 1 APT = 10 USDC
        // 需要将价格转换为 sqrt_price，再转换为 tick
        50000 // 示例值，实际需要精确计算
    }
}
```

## 测试建议

### 测试用例设计

1. **成功场景测试**
   - 新池子创建 + 添加流动性
   - 现有池子添加流动性
   - 不同价格范围的流动性添加

2. **边界条件测试**
   - 最小流动性数量
   - 最大滑点容忍度
   - 极端价格范围

3. **错误场景测试**
   - 余额不足
   - 过期交易
   - 无效参数

### 集成测试流程

```bash
# 1. 准备测试环境
aptos init --network testnet

# 2. 获取测试代币
# 获取测试网 APT 和 USDC

# 3. 部署合约 (如需要)
aptos move publish --named-addresses dex_contract=0x3673bee9e7b78ae63d4a9e3d58425bc97e7f3b8d68efc846ee732b14369333dd

# 4. 执行添加流动性
aptos move run --function-id default::liquidity_provider::add_usdc_apt_liquidity \
  --args u64:1000000 u64:100000000 u32:20
```

## 部署清单

### 环境准备
- [ ] Aptos CLI 安装和配置
- [ ] 测试网账户创建和资金准备
- [ ] USDC 和 APT 测试代币获取

### 代码实现
- [ ] 核心添加流动性功能
- [ ] 错误处理和验证逻辑
- [ ] 价格和 tick 计算功能
- [ ] 用户界面集成 (如需要)

### 测试验证
- [ ] 单元测试覆盖
- [ ] 集成测试验证
- [ ] 错误场景测试
- [ ] 性能和安全测试

## 注意事项

1. **价格计算**: tick 和 sqrt_price 的转换需要精确的数学计算
2. **滑点保护**: 在高波动环境下可能需要动态调整滑点容忍度
3. **Gas 费用**: 复杂操作可能消耗较多 Gas，需要合理估算
4. **时间敏感**: 价格变动频繁时，交易可能因为价格偏差而失败
5. **权限管理**: 确保只有头寸所有者能够操作对应的流动性

## 后续优化

1. **动态价格范围**: 基于历史波动率自动调整 tick 范围
2. **批量操作**: 支持一次性为多个池子添加流动性
3. **自动复投**: 收取的手续费自动重新投入流动性
4. **风险管理**: 添加无常损失计算和提醒功能

---

**文档版本**: v1.0
**最后更新**: 2024年
**适用合约**: Hyperion DEX v3 测试网