"use client";

import { useEffect } from "react";
import { ServerCrash, RotateCcw } from "lucide-react";

/**
 * 管理后台错误边界
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("管理后台错误:", error);
  }, [error]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-8 shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <ServerCrash className="h-7 w-7 text-red-400" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-white">
          管理后台异常
        </h2>
        <p className="mb-5 text-sm text-white/60">
          后台管理页面加载失败，请稍后重试。
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-bg-dark transition-all hover:shadow-[0_0_20px_theme(colors.primary-glow)]"
        >
          <RotateCcw className="h-4 w-4" />
          重试
        </button>
      </div>
    </div>
  );
}
