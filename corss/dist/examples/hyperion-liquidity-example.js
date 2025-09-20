#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
exports.checkBalances = checkBalances;
exports.showLiquidityStrategies = showLiquidityStrategies;
const hyperion_liquidity_service_1 = require("../src/hyperion-liquidity-service");
/**
 * Hyperion流动性添加完整示例
 * 演示如何使用wrapper合约向Hyperion添加APT/USDC流动性
 */
async function main() {
    console.log('🏊‍♂️ Hyperion APT/USDC 流动性添加示例');
    console.log('=====================================\n');
    // ⚠️ 重要：请替换为您的实际私钥！
    const userPrivateKey = "0x38ac0815b8a3922ed7ce80135bae28c4ba6cf7d5e3ea9e56acddcba0d0c40c9e"; // 请填入您的Aptos账户私钥
    if (userPrivateKey === "0x38ac0815b8a3922ed7ce80135bae28c4ba6cf7d5e3ea9e56acddcba0d0c40c9e") {
        console.error('❌ 请先设置您的私钥！');
        console.log('编辑 examples/hyperion-liquidity-example.ts 文件');
        console.log('将 userPrivateKey 替换为您的实际私钥');
        return;
    }
    try {
        // 1. 检查合约状态
        console.log('1️⃣ 检查合约配置状态...');
        const config = await hyperion_liquidity_service_1.hyperionLiquidityService.getContractConfig();
        if (!config) {
            throw new Error('无法获取合约配置，请检查合约是否已部署');
        }
        console.log('合约配置:', {
            admin: config.admin,
            hyperionRouter: config.hyperionRouter,
            paused: config.paused ? '❌ 已暂停' : '✅ 正常运行'
        });
        if (config.paused) {
            throw new Error('合约已暂停，无法添加流动性');
        }
        // 2. 准备添加流动性参数
        console.log('\n2️⃣ 准备添加流动性参数...');
        const params = {
            userPrivateKey: userPrivateKey,
            // 数量设置
            usdcAmount: "1.0", // 添加10 USDC
            aptAmount: "1.0", // 添加100 APT
            // 价格范围设置（中等范围）
            tickLower: hyperion_liquidity_service_1.COMMON_PRESETS.TICK_RANGES.MEDIUM.lower,
            tickUpper: hyperion_liquidity_service_1.COMMON_PRESETS.TICK_RANGES.MEDIUM.upper,
            // 手续费等级（中等：0.3%）
            feeTier: hyperion_liquidity_service_1.COMMON_PRESETS.FEE_TIERS.MEDIUM,
            // 风险控制
            slippageToleranceBps: hyperion_liquidity_service_1.COMMON_PRESETS.SLIPPAGE.MEDIUM, // 1%滑点
            deadlineMinutes: 10 // 10分钟截止时间
        };
        console.log('添加流动性参数:', {
            USDC数量: params.usdcAmount,
            APT数量: params.aptAmount,
            价格范围: `Tick ${params.tickLower} - ${params.tickUpper}`,
            手续费等级: `${params.feeTier} (0.3%)`,
            滑点容忍度: `${params.slippageToleranceBps / 100}%`,
            截止时间: `${params.deadlineMinutes}分钟`
        });
        // 3. 估算最优数量（可选）
        console.log('\n3️⃣ 估算最优流动性数量...');
        const estimation = await hyperion_liquidity_service_1.hyperionLiquidityService.estimateLiquidityAmounts(params.tickLower, params.tickUpper, params.feeTier, params.usdcAmount, params.aptAmount);
        if (estimation) {
            console.log('估算结果:', {
                预计流动性: estimation.liquidity,
                最优USDC: estimation.optimalUsdc,
                最优APT: estimation.optimalApt
            });
        }
        // 4. 执行添加流动性
        console.log('\n4️⃣ 开始添加流动性...');
        console.log('⏳ 请耐心等待，这可能需要几分钟...\n');
        const result = await hyperion_liquidity_service_1.hyperionLiquidityService.addLiquidity(params);
        // 5. 处理结果
        if (result.success) {
            console.log('\n🎉 流动性添加成功！');
            console.log('=====================================');
            console.log('交易哈希:', result.txHash);
            console.log('Position地址:', result.positionAddress);
            console.log('实际使用USDC:', result.actualUsdcAmount);
            console.log('实际使用APT:', result.actualAptAmount);
            console.log('获得流动性:', result.liquidityAmount);
            // 6. 查询用户所有Positions
            console.log('\n6️⃣ 查询您的所有流动性Positions...');
            // 从私钥推导地址（简化方法）
            const userAddress = "0x" + "ba916e9cbf294e552e4281dfc227fadbd3413d81c2fc233816f85dd89d53f54c"; // 占位符地址
            const positions = await hyperion_liquidity_service_1.hyperionLiquidityService.getUserPositions(userAddress);
            console.log(`找到 ${positions.length} 个Position:`);
            for (let i = 0; i < positions.length; i++) {
                const position = positions[i];
                const details = await hyperion_liquidity_service_1.hyperionLiquidityService.getPositionDetails(position);
                if (details) {
                    console.log(`Position ${i + 1}:`, {
                        地址: position,
                        流动性: details.liquidity,
                        价格范围: `${details.tickLower} - ${details.tickUpper}`
                    });
                }
            }
            console.log('\n✅ 完成！您已成功添加APT/USDC流动性到Hyperion DEX');
            console.log('💡 提示：您可以在Hyperion网站上管理您的流动性Position');
        }
        else {
            console.log('\n❌ 流动性添加失败');
            console.log('错误信息:', result.error);
            // 常见错误解决方案
            console.log('\n🔧 可能的解决方案:');
            console.log('1. 检查APT和USDC余额是否足够');
            console.log('2. 检查网络连接和RPC状态');
            console.log('3. 检查tick范围是否合理');
            console.log('4. 适当增加滑点容忍度');
            console.log('5. 确保Hyperion合约地址正确');
        }
    }
    catch (error) {
        console.error('\n💥 执行过程中发生错误:', error);
        console.log('\n🆘 如需帮助，请检查:');
        console.log('1. 私钥格式是否正确');
        console.log('2. 账户是否有足够的gas费用');
        console.log('3. 网络连接是否正常');
        console.log('4. 合约是否已正确部署');
    }
}
// 额外的工具函数示例
/**
 * 检查用户余额的示例
 */
async function checkBalances() {
    console.log('\n💰 余额检查示例');
    console.log('================');
    const userAddress = "0xba916e9cbf294e552e4281dfc227fadbd3413d81c2fc233816f85dd89d53f54c"; // 请替换为实际地址
    if (userAddress !== "0xba916e9cbf294e552e4281dfc227fadbd3413d81c2fc233816f85dd89d53f54c") {
        const aptBalance = await hyperion_liquidity_service_1.hyperionLiquidityService.getAptBalance(userAddress);
        const usdcBalance = await hyperion_liquidity_service_1.hyperionLiquidityService.getUsdcBalance(userAddress);
        console.log('当前余额:');
        console.log(`APT: ${aptBalance} Octa`);
        console.log(`USDC: ${usdcBalance} Micro`);
    }
}
/**
 * 不同策略的流动性添加示例
 */
function showLiquidityStrategies() {
    console.log('\n📊 流动性策略示例');
    console.log('==================');
    const strategies = [
        {
            name: "保守策略",
            description: "宽价格范围，低手续费",
            params: {
                tickRange: hyperion_liquidity_service_1.COMMON_PRESETS.TICK_RANGES.WIDE,
                feeTier: hyperion_liquidity_service_1.COMMON_PRESETS.FEE_TIERS.VERY_LOW,
                slippage: hyperion_liquidity_service_1.COMMON_PRESETS.SLIPPAGE.LOW
            }
        },
        {
            name: "平衡策略",
            description: "中等价格范围，中等手续费",
            params: {
                tickRange: hyperion_liquidity_service_1.COMMON_PRESETS.TICK_RANGES.MEDIUM,
                feeTier: hyperion_liquidity_service_1.COMMON_PRESETS.FEE_TIERS.MEDIUM,
                slippage: hyperion_liquidity_service_1.COMMON_PRESETS.SLIPPAGE.MEDIUM
            }
        },
        {
            name: "激进策略",
            description: "窄价格范围，高手续费",
            params: {
                tickRange: hyperion_liquidity_service_1.COMMON_PRESETS.TICK_RANGES.NARROW,
                feeTier: hyperion_liquidity_service_1.COMMON_PRESETS.FEE_TIERS.HIGH,
                slippage: hyperion_liquidity_service_1.COMMON_PRESETS.SLIPPAGE.HIGH
            }
        }
    ];
    strategies.forEach(strategy => {
        console.log(`\n${strategy.name}: ${strategy.description}`);
        console.log(`- 价格范围: ${strategy.params.tickRange.lower} - ${strategy.params.tickRange.upper}`);
        console.log(`- 手续费等级: ${strategy.params.feeTier}`);
        console.log(`- 建议滑点: ${strategy.params.slippage / 100}%`);
    });
}
// 运行主函数
if (require.main === module) {
    main().catch(console.error);
    // 显示策略信息
    showLiquidityStrategies();
}
//# sourceMappingURL=hyperion-liquidity-example.js.map