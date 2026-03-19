import { useQuery } from "@tanstack/react-query";

import {
  assetService,
  type AssetListQuery,
} from "@/services/asset";

/**
 * 资产列表数据获取 Hook
 * 使用 React Query 管理缓存、加载状态和错误处理
 */
export function useAssets(query: AssetListQuery = {}) {
  return useQuery({
    queryKey: ["assets", query],
    queryFn: () => assetService.getAssets(query),
  });
}
