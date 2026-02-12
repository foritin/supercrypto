import { FileQuestion, Home } from "lucide-react";
import Link from "next/link";

/**
 * 自定义 404 页面
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center rounded-2xl border border-white/10 bg-bg-card/80 backdrop-blur-xl p-8 shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <FileQuestion className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-1 text-5xl font-bold text-white">404</h2>
        <p className="mb-2 text-lg font-medium text-white/80">
          页面未找到
        </p>
        <p className="mb-6 text-sm text-white/50">
          您访问的页面不存在或已被移除。
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-bg-dark transition-all hover:shadow-[0_0_20px_theme(colors.primary-glow)]"
        >
          <Home className="h-4 w-4" />
          返回首页
        </Link>
      </div>
    </div>
  );
}
