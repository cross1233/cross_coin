// Base到Aptos CCTP跨链桥主入口文件
export { BaseCCTPSender, CrossChainParams, CrossChainResult } from './base-sender';
export { AptosCCTPReceiver, AptosReceiveParams, AptosReceiveResult, aptosCCTPReceiver } from './aptos-receiver';
export { CircleAttestationService, AttestationData, circleAttestationService } from './circle-attestation';
export { 
  CrossChainOrchestrator, 
  FullCrossChainParams, 
  FullCrossChainResult, 
  crossChainOrchestrator 
} from './cross-chain-orchestrator';

// 导出配置常量
export { 
  BASE_SEPOLIA_CONFIG, 
  APTOS_DOMAIN_ID,
  evmToAptosAddress,
  aptosAddressToBytes32 
} from './base-sender';

export { 
  APTOS_TESTNET_CONFIG, 
  CROSS_CHAIN_MODULE_ADDRESS 
} from './aptos-receiver';
