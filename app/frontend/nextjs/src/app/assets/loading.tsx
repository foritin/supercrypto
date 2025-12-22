/**
 * Assets 页面专属加载状态
 * 使用统一的骨架屏组件
 */

import { PageSkeleton } from "@/components/layout";

export default function AssetsLoading() {
  return <PageSkeleton variant="list" />;
}
