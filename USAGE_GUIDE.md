# USDC/APT 流动性提供者 - 使用指南

## 快速开始

### 1. 环境准备

```bash
# 检查 Aptos CLI 版本
aptos --version

# 切换到测试网
aptos init --network testnet

# 检查账户余额
aptos account list --query balance
```

### 2. 获取测试代币

```bash
# 获取测试网 APT (如果余额不足)
aptos account fund-with-faucet --account YOUR_ADDRESS

# 获取测试网 USDC
# 注意: 需要从测试网水龙头获取 USDC，地址：
# 0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832
```

### 3. 编译和部署

```bash
# 编译项目
cd /home/su/dome/move/corss1.0/corss
aptos move compile

# 发布合约 (如果需要)
aptos move publish --named-addresses cross_chain=YOUR_ADDRESS
```

## 使用方法

### 方法1: 直接调用函数

```bash
# 添加流动性 - 示例参数
aptos move run \
  --function-id YOUR_ADDRESS::liquidity_provider::add_usdc_apt_liquidity \
  --args \
    u64:1000000 \      # 1 USDC (假设6位小数)
    u64:100000000 \    # 1 APT (8位小数)
    u32:20             # 20%价格范围
```

### 方法2: 使用脚本

```bash
# 运行预定义脚本
aptos move run-script \
  --script-path scripts/add_liquidity_example.move \
  --args u64:1000000 u64:100000000 u32:20
```

### 方法3: 查看函数调用

```bash
# 检查池子是否存在
aptos move view \
  --function-id YOUR_ADDRESS::liquidity_provider::is_pool_exists

# 查看用户余额
aptos move view \
  --function-id YOUR_ADDRESS::liquidity_provider::get_user_balances \
  --args address:YOUR_ADDRESS

# 查看池子信息
aptos move view \
  --function-id YOUR_ADDRESS::liquidity_provider::get_pool_info

# 计算最优数量
aptos move view \
  --function-id YOUR_ADDRESS::liquidity_provider::calculate_optimal_amounts \
  --args u64:1000000 u64:100000000 u32:20
```

## 参数说明

### USDC 数量 (usdc_amount)
- **单位**: 取决于USDC的小数位设置
- **示例**: 1000000 = 1 USDC (如果是6位小数)
- **获取方式**: 查看测试网USDC的metadata

### APT 数量 (apt_amount)
- **单位**: octas (1 APT = 100,000,000 octas)
- **示例**: 100000000 = 1 APT
- **最小值**: 建议至少 0.1 APT (10000000 octas)

### 价格范围百分比 (tick_range_percent)
- **推荐值**: 10-30
- **说明**:
  - 10 = ±10%价格范围，流动性更集中，收益更高但风险更大
  - 30 = ±30%价格范围，流动性更分散，风险较小但收益较低
- **注意**: 如果当前价格移出设定范围，流动性将不再赚取手续费

## 实际使用示例

### 示例1: 小额测试

```bash
# 添加 0.1 USDC + 0.1 APT 的流动性
aptos move run \
  --function-id YOUR_ADDRESS::liquidity_provider::add_usdc_apt_liquidity \
  --args u64:100000 u64:10000000 u32:25
```

### 示例2: 正常数量

```bash
# 添加 10 USDC + 1 APT 的流动性
aptos move run \
  --function-id YOUR_ADDRESS::liquidity_provider::add_usdc_apt_liquidity \
  --args u64:10000000 u64:100000000 u32:20
```

### 示例3: 较大数量

```bash
# 添加 100 USDC + 10 APT 的流动性
aptos move run \
  --function-id YOUR_ADDRESS::liquidity_provider::add_usdc_apt_liquidity \
  --args u64:100000000 u64:1000000000 u32:15
```

## 测试流程

### 1. 运行单元测试

```bash
cd /home/su/dome/move/corss1.0/corss
aptos move test
```

### 2. 预检查操作

```bash
# 检查余额
aptos move view \
  --function-id YOUR_ADDRESS::liquidity_provider::get_user_balances \
  --args address:YOUR_ADDRESS

# 检查池子状态
aptos move view \
  --function-id YOUR_ADDRESS::liquidity_provider::is_pool_exists
```

### 3. 模拟操作

```bash
# 计算添加流动性的预期结果
aptos move view \
  --function-id YOUR_ADDRESS::liquidity_provider::calculate_optimal_amounts \
  --args u64:1000000 u64:100000000 u32:20
```

## 错误处理

### 常见错误及解决方案

| 错误代码 | 含义 | 解决方案 |
|---------|------|----------|
| 1001 | USDC余额不足 | 获取更多测试USDC或减少数量 |
| 1002 | APT余额不足 | 从水龙头获取APT或减少数量 |
| 1003 | 数量无效 | 确保USDC和APT数量都大于0 |
| 1004 | tick范围无效 | 检查价格范围参数 |
| 1005 | 交易过期 | 重新提交交易 |
| 1006 | 滑点无效 | 调整滑点参数 |

### 调试步骤

1. **检查代币余额**
   ```bash
   aptos account list --query balance
   ```

2. **验证参数格式**
   ```bash
   # 确保参数类型正确: u64, u32
   ```

3. **查看交易详情**
   ```bash
   aptos account list --query transactions
   ```

## 高级使用

### 自定义配置

如果需要修改默认参数，可以编辑 `liquidity_provider.move` 中的常量：

```move
const DEFAULT_SLIPPAGE: u64 = 5;            // 修改默认滑点
const DEFAULT_DEADLINE_SECONDS: u64 = 1800; // 修改默认期限
const FEE_TIER: u8 = 1;                     // 修改费率等级
```

### 批量操作

可以编写脚本进行批量操作：

```bash
#!/bin/bash
# 批量添加流动性脚本

amounts=(1000000 2000000 5000000)
for amount in "${amounts[@]}"; do
    aptos move run \
      --function-id YOUR_ADDRESS::liquidity_provider::add_usdc_apt_liquidity \
      --args u64:$amount u64:$(($amount * 100)) u32:20
    sleep 5  # 等待交易确认
done
```

## 监控和管理

### 查看头寸

添加流动性后，你可以通过以下方式监控：

1. **查看事件日志**
   ```bash
   aptos account list --query events
   ```

2. **检查池子状态**
   ```bash
   aptos move view \
     --function-id YOUR_ADDRESS::liquidity_provider::get_pool_info
   ```

3. **查看收益情况**
   - 通过Hyperion官方界面查看
   - 或使用其他查看函数

## 注意事项

1. **测试环境**: 当前代码配置为测试网，请勿在主网使用
2. **代币地址**: USDC地址为硬编码，确保使用正确的测试网地址
3. **Gas费用**: 操作需要消耗APT作为gas费
4. **价格波动**: 在价格大幅波动时可能导致交易失败
5. **流动性管理**: 添加流动性后记得定期检查和管理头寸

## 获取帮助

如果遇到问题，可以：

1. 查看错误日志和错误代码对照表
2. 检查[Hyperion官方文档](https://docs.hyperion.xyz)
3. 在测试网上先小额测试
4. 查看合约事件了解具体执行情况

---

**免责声明**: 这是测试网实现，仅用于学习和测试目的。在主网使用前请进行充分测试和审计。