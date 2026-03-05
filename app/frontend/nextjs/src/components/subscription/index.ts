// Subscription Components Export
// 认购相关组件统一导出

export { useSubscriptionOrchestrator } from "./subscription-orchestrator";
export type {
  TransactionState,
  FailureReason,
  TransactionContext,
  UseSubscriptionOrchestratorReturn,
  SubscriptionParams,
} from "./subscription-orchestrator";

export { SubscriptionModalV2 } from "./subscription-modal-v2";
export type { SubscriptionModalV2Props } from "./subscription-modal-v2";

export { TransactionStatusPanel } from "./transaction-tracker";
export type { TransactionStatusPanelProps } from "./transaction-tracker";

export { ErrorStatePanel } from "./error-states";
export type { ErrorStatePanelProps } from "./error-states";

export { ProductSelector } from "./product-selector";
export type { ProductSelectorProps, ProductType } from "./product-selector";

// Legacy export for backward compatibility
export { SubscriptionModal } from "./subscription-modal";
export type { SubscriptionModalProps } from "./subscription-modal";
