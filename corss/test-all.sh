#!/bin/bash

echo "🚀 开始完整测试流程..."
echo "=================================="

echo "📦 1. 编译TypeScript项目..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ TypeScript编译成功"
else
    echo "❌ TypeScript编译失败"
    exit 1
fi

echo ""
echo "🧪 2. 运行单元测试..."
npm test
if [ $? -eq 0 ]; then
    echo "✅ 单元测试通过"
else
    echo "❌ 单元测试失败"
    exit 1
fi

echo ""
echo "🔍 3. 代码质量检查..."
npm run lint
if [ $? -eq 0 ]; then
    echo "✅ 代码质量检查通过"
else
    echo "⚠️ 代码质量检查有警告"
fi

echo ""
echo "🌐 4. 链上功能测试..."
echo "4.1 跨链转账测试..."
npm run example cross-chain
if [ $? -eq 0 ]; then
    echo "✅ 跨链转账测试通过"
else
    echo "❌ 跨链转账测试失败"
fi

echo ""
echo "4.2 余额查询测试..."
npm run example balance
if [ $? -eq 0 ]; then
    echo "✅ 余额查询测试通过"
else
    echo "❌ 余额查询测试失败"
fi

echo ""
echo "4.3 账户创建测试..."
npm run example create-account
if [ $? -eq 0 ]; then
    echo "✅ 账户创建测试通过"
else
    echo "❌ 账户创建测试失败"
fi

echo ""
echo "🎉 测试流程完成！"
echo "=================================="
