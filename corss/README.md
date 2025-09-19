# Base到Aptos CCTP跨链桥

一个完整的Base测试网到Aptos测试网的CCTP（Cross-Chain Transfer Protocol）跨链桥实现，支持USDC的安全跨链转账。

## 🚀 功能特性

- ✅ Base Sepolia → Aptos Testnet USDC跨链
- ✅ 使用Circle官方CCTP协议
- ✅ TypeScript + Move双语言实现
- ✅ 完整的错误处理和重试机制
- ✅ 实时跨链状态监控
- ✅ 支持MetaMask和Aptos钱包

## 📋 项目结构

```
corss1.0/
├── sources/                    # Move合约源码
│   ├── cctp_receiver.move     # CCTP接收合约
│   └── cctp_config.move       # 配置常量
├── src/                       # TypeScript源码
│   ├── base-sender.ts         # Base链发送器
│   ├── circle-attestation.ts  # Circle签名获取
│   ├── aptos-receiver.ts      # Aptos接收器
│   ├── cross-chain-orchestrator.ts # 跨链编排器
│   └── index.ts               # 主入口文件
├── examples/                  # 示例代码
│   └── complete-example.ts    # 完整示例
├── tests/                     # 测试文件
├── Move.toml                  # Move项目配置
├── package.json               # Node.js依赖
├── tsconfig.json             # TypeScript配置
└── README.md                 # 项目文档
```

## 🛠️ 安装与设置

### 1. 环境要求

- Node.js >= 18.0.0
- TypeScript >= 5.0.0
- Aptos CLI
- Git

### 2. 克隆项目

```bash
git clone <your-repo-url>
cd corss1.0
```

### 3. 安装依赖

```bash
npm install
```

### 4. 编译项目

```bash
# 编译TypeScript
npm run build

# 编译Move合约
npm run move:build
```

## 🎯 使用方法

### 快速开始

```bash
# 运行完整跨链示例
npm run example cross-chain

# 查询余额
npm run example balance

# 创建Aptos测试账户
npm run example create-account
```
# 1. 编译测试
npm run build

# 2. 单元测试
npm test

# 3. 代码质量检查
npm run lint

# 4. 链上功能测试
npm run example cross-chain
npm run example balance
npm run example create-account

# 5. Move合约测试（需要先部署）
npm run move:test

### 编程接口

```typescript
import { crossChainOrchestrator, FullCrossChainParams } from './src';

const params: FullCrossChainParams = {
  amount: '1.0',
  recipientAddress: 'YOUR_APTOS_ADDRESS',
  baseSigner: yourEthersWallet,
  aptosPrivateKey: 'YOUR_APTOS_PRIVATE_KEY'
};

const result = await crossChainOrchestrator.executeCrossChain(params);
console.log('跨链结果:', result);
```

## 📝 配置说明

### 网络配置

- **Base Sepolia**: https://sepolia.base.org
- **Aptos Testnet**: https://fullnode.testnet.aptoslabs.com

### 合约地址

项目使用Circle官方CCTP合约：

**Base Sepolia:**
- TokenMessenger: `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d`
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

**Aptos Testnet:**
- MessageTransmitter: `0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9`
- TokenMessengerMinter: `0x5f9b937419dda90aa06c1836b7847f65bbbe3f1217567758dc2488be31a477b9`

## 🧪 测试

```bash
# 运行单元测试
npm test

# 运行linting
npm run lint

# 测试Move合约
npm run move:test
```

## 📚 文档

- [技术方案对比](./技术方案对比.md)
- [部署指南](./部署指南.md)
- [完整流程文档](./all.md)

## 🔧 开发

### 可用脚本

- `npm run build` - 编译TypeScript
- `npm run dev` - 运行开发服务器
- `npm run test` - 运行测试
- `npm run lint` - 代码检查
- `npm run move:build` - 编译Move合约
- `npm run move:test` - 测试Move合约
- `npm run move:publish` - 发布Move合约

## ⚠️ 注意事项

1. **测试网环境**: 当前配置仅用于测试网，请勿在主网使用
2. **私钥安全**: 不要在代码中硬编码私钥，使用环境变量
3. **Gas费用**: 确保Base和Aptos账户有足够的gas费用
4. **USDC余额**: 确保Base账户有足够的测试USDC

## 🤝 贡献

欢迎提交Issue和Pull Request。

## 📄 许可证

MIT License
