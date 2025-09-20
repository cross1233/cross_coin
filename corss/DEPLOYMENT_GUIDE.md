# USDC/APT 流动性提供者 - 部署指南

## 项目概述

本项目实现了基于 Hyperion DEX 测试网的 USDC/APT 流动性提供功能。这是一个最小可行产品(MVP)，专注于核心的添加流动性功能。

### 项目结构
```
/home/su/dome/move/corss1.0/
├── corss/                          # 主项目目录
│   ├── Move.toml                   # 项目配置
│   └── sources/
│       ├── liquidity_provider.move # 主要模块
│       └── liquidity_test.move     # 测试模块
├── hyperion-interface/             # Hyperion DEX 接口
├── scripts/
│   └── add_liquidity_example.move  # 使用示例脚本
├── USDC_APT_LIQUIDITY_MVP.md       # 技术方案文档
├── USAGE_GUIDE.md                  # 使用指南
└── DEPLOYMENT_GUIDE.md             # 本文档
```

## 前置要求

### 1. 环境准备
```bash
# 安装 Aptos CLI (如果尚未安装)
curl -fsSL https://aptos.dev/scripts/install_cli.py | python3

# 验证安装
aptos --version

# 初始化 Aptos 配置
aptos init --network testnet
```

### 2. 账户准备
```bash
# 查看当前账户地址
aptos account list

# 获取测试网 APT
aptos account fund-with-faucet --account YOUR_ADDRESS

# 检查余额
aptos account list --query balance
```

### 3. 测试代币准备
- **APT**: 通过水龙头获取
- **USDC**: 获取测试网USDC (地址: `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832`)

## 部署步骤

### 第一步：编译项目

```bash
cd /home/su/dome/move/corss1.0/corss

# 编译检查
aptos move compile

# 确认编译成功
# Expected output: "BUILDING cross_chain" 和绿色的成功消息
```

### 第二步：运行测试

```bash
# 运行单元测试（可选，用于验证代码逻辑）
aptos move test

# 注意：测试可能因为测试环境设置而失败，这不影响实际部署
```

### 第三步：部署合约

```bash
# 部署到测试网
aptos move publish --named-addresses cross_chain=YOUR_ADDRESS

# 替换 YOUR_ADDRESS 为你的实际地址
# 例如：
# aptos move publish --named-addresses cross_chain=0x123abc...
```

预期输出：
```
{
  "Result": {
    "transaction_hash": "0x...",
    "gas_used": ...,
    "gas_unit_price": ...,
    "sender": "0x...",
    "success": true,
    ...
  }
}
```

### 第四步：验证部署

```bash
# 检查部署的模块
aptos account list --query modules --account YOUR_ADDRESS

# 验证特定函数
aptos move view \
  --function-id YOUR_ADDRESS::liquidity_provider::is_pool_exists
```

## 使用部署的合约
V2加上

### 1. 检查池子状态
```bash
aptos move view \
  --function-id YOUR_ADDRESS::liquidity_provider_v2::is_pool_exists
```

### 2. 查看用户余额
```bash
aptos move view \
  --function-id YOUR_ADDRESS::liquidity_provider_v2::get_user_balances \
  --args address:YOUR_ADDRESS
```

### 3. 添加流动性
```bash
# 添加 1 USDC + 0.1 APT 的流动性，价格范围 ±20%
aptos move run \
  --function-id YOUR_ADDRESS::liquidity_provider_v2::add_usdc_apt_liquidity \
  --args u64:1000000 u64:10000000 u32:20
```

### 4. 使用脚本方式
```bash
aptos move run-script \
  --script-path scripts/add_liquidity_example.move \
  --args u64:1000000 u64:10000000 u32:20
```

## 配置参数说明

### Move.toml 重要配置
```toml
[addresses]
cross_chain = "YOUR_ADDRESS"               # 你的部署地址
hyperion_dex = "0x3673bee9e7b78ae63d4a9e3d58425bc97e7f3b8d68efc846ee732b14369333dd"  # Hyperion测试网
dex_contract = "0x3673bee9e7b78ae63d4a9e3d58425bc97e7f3b8d68efc846ee732b14369333dd"  # 同上

[dependencies]
dex = { local = "../hyperion-interface" }  # 本地Hyperion接口
```

### 关键常量
```move
const USDC_ADDRESS: address = @0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832;
const FEE_TIER: u8 = 1;                     // 0.05% 费率
const DEFAULT_SLIPPAGE: u64 = 5;            // 5% 默认滑点
```

## 监控和管理

### 查看交易历史
```bash
# 查看账户交易
aptos account list --query transactions --account YOUR_ADDRESS

# 查看特定交易详情
aptos transaction show --transaction-id TRANSACTION_HASH
```

### 查看事件
```bash
# 查看账户事件
aptos account list --query events --account YOUR_ADDRESS
```

### Gas 费用估算
- 部署合约：约 1000-5000 octas
- 添加流动性：约 500-2000 octas
- 查看函数调用：免费

## 故障排除

### 常见部署错误

1. **地址不匹配**
   ```
   Error: Address resolution failure
   ```
   **解决**：确保 Move.toml 中的地址与你的账户地址一致

2. **余额不足**
   ```
   Error: Insufficient balance
   ```
   **解决**：确保账户有足够的 APT 支付 gas 费用

3. **模块已存在**
   ```
   Error: Module already exists
   ```
   **解决**：使用 `--upgrade` 参数或创建新账户

4. **依赖问题**
   ```
   Error: Dependency resolution failed
   ```
   **解决**：检查 hyperion-interface 路径是否正确

### 常见使用错误

1. **代币余额不足**
   ```
   Error: Abort 1001 (E_INSUFFICIENT_USDC_BALANCE)
   ```
   **解决**：获取更多测试 USDC

2. **参数错误**
   ```
   Error: Invalid argument
   ```
   **解决**：检查参数类型和值

3. **池子不存在**
   ```
   Error: Pool does not exist
   ```
   **解决**：首次使用会自动创建池子

## 升级和维护

### 升级合约
```bash
# 升级部署
aptos move publish --named-addresses cross_chain=YOUR_ADDRESS --upgrade
```

### 配置修改
如需修改配置，编辑相应的常量并重新部署：
- 滑点容忍度
- 费率等级
- 默认参数

### 监控建议
1. 定期检查池子状态
2. 监控gas使用情况
3. 跟踪流动性操作事件
4. 备份重要交易哈希

## 生产环境注意事项

### 安全检查清单
- [ ] 代码审计完成
- [ ] 测试覆盖率充分
- [ ] 参数验证严格
- [ ] 错误处理完善
- [ ] 权限控制恰当

### 主网部署准备
1. **代码审计**：进行专业的安全审计
2. **压力测试**：在测试网进行大量测试
3. **参数调优**：根据实际市场情况调整参数
4. **监控系统**：建立完善的监控和告警
5. **应急预案**：准备应急处理方案

### 合规考虑
- 了解当地法律法规
- 考虑 KYC/AML 要求
- 风险披露和用户教育
- 运营许可和监管合规

## 支持和帮助

### 技术文档
- [技术方案文档](./USDC_APT_LIQUIDITY_MVP.md)
- [使用指南](./USAGE_GUIDE.md)
- [Hyperion 官方文档](https://docs.hyperion.xyz)

### 社区资源
- Aptos 开发者社区
- Hyperion Discord
- Move 编程语言文档

### 联系方式
如有问题，请通过以下方式寻求帮助：
1. 查看错误日志和文档
2. 在相关社区提问
3. 提交 GitHub Issue（如果开源）

---

**免责声明**: 本项目仅用于学习和测试目的。在生产环境使用前，请进行充分的测试、审计和风险评估。开发者不对使用本代码可能造成的任何损失承担责任。