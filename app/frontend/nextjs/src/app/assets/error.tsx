"use client";

import { PackageX, RotateCcw } from "lucide-react";
import { useEffect } from "react";

/**
 * 资产页面错误边界
 */
export default function AssetsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("资产页面错误:", error);
  }, [error]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-8 shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <PackageX className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-white">
          资产加载失败
        </h2>
        <p className="mb-5 text-sm text-white/60">
          无法加载资产数据，请稍后重试。
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-bg-dark transition-all hover:shadow-[0_0_20px_theme(colors.primary-glow)]"
        >
          <RotateCcw className="h-4 w-4" />
          重新加载
        </button>
      </div>
    </div>
  );
}
