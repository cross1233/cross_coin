"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CROSS_CHAIN_MODULE_ADDRESS = exports.APTOS_TESTNET_CONFIG = exports.aptosAddressToBytes32 = exports.evmToAptosAddress = exports.APTOS_DOMAIN_ID = exports.BASE_SEPOLIA_CONFIG = exports.crossChainOrchestrator = exports.CrossChainOrchestrator = exports.circleAttestationService = exports.CircleAttestationService = exports.aptosCCTPReceiver = exports.AptosCCTPReceiver = exports.BaseCCTPSender = void 0;
// Base到Aptos CCTP跨链桥主入口文件
var base_sender_1 = require("./base-sender");
Object.defineProperty(exports, "BaseCCTPSender", { enumerable: true, get: function () { return base_sender_1.BaseCCTPSender; } });
var aptos_receiver_1 = require("./aptos-receiver");
Object.defineProperty(exports, "AptosCCTPReceiver", { enumerable: true, get: function () { return aptos_receiver_1.AptosCCTPReceiver; } });
Object.defineProperty(exports, "aptosCCTPReceiver", { enumerable: true, get: function () { return aptos_receiver_1.aptosCCTPReceiver; } });
var circle_attestation_1 = require("./circle-attestation");
Object.defineProperty(exports, "CircleAttestationService", { enumerable: true, get: function () { return circle_attestation_1.CircleAttestationService; } });
Object.defineProperty(exports, "circleAttestationService", { enumerable: true, get: function () { return circle_attestation_1.circleAttestationService; } });
var cross_chain_orchestrator_1 = require("./cross-chain-orchestrator");
Object.defineProperty(exports, "CrossChainOrchestrator", { enumerable: true, get: function () { return cross_chain_orchestrator_1.CrossChainOrchestrator; } });
Object.defineProperty(exports, "crossChainOrchestrator", { enumerable: true, get: function () { return cross_chain_orchestrator_1.crossChainOrchestrator; } });
// 导出配置常量
var base_sender_2 = require("./base-sender");
Object.defineProperty(exports, "BASE_SEPOLIA_CONFIG", { enumerable: true, get: function () { return base_sender_2.BASE_SEPOLIA_CONFIG; } });
Object.defineProperty(exports, "APTOS_DOMAIN_ID", { enumerable: true, get: function () { return base_sender_2.APTOS_DOMAIN_ID; } });
Object.defineProperty(exports, "evmToAptosAddress", { enumerable: true, get: function () { return base_sender_2.evmToAptosAddress; } });
Object.defineProperty(exports, "aptosAddressToBytes32", { enumerable: true, get: function () { return base_sender_2.aptosAddressToBytes32; } });
var aptos_receiver_2 = require("./aptos-receiver");
Object.defineProperty(exports, "APTOS_TESTNET_CONFIG", { enumerable: true, get: function () { return aptos_receiver_2.APTOS_TESTNET_CONFIG; } });
Object.defineProperty(exports, "CROSS_CHAIN_MODULE_ADDRESS", { enumerable: true, get: function () { return aptos_receiver_2.CROSS_CHAIN_MODULE_ADDRESS; } });
//# sourceMappingURL=index.js.map