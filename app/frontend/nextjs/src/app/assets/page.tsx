import AssetsClient from "./assets-client";

/**
 * 资产列表页面 - Server Component
 * 数据获取和交互逻辑委托给 AssetsClient (Client Component + React Query)
 */
export default function AssetsPage() {
  return <AssetsClient />;
}
