"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function AssetDetailSkeleton() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 animate-pulse">
      {/* 面包屑骨架 */}
      <div className="flex items-center gap-2 mb-5">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-4 h-4" />
        <Skeleton className="w-24 h-5" />
        <Skeleton className="w-4 h-4" />
        <Skeleton className="w-48 h-5" />
      </div>

      {/* 标题区骨架 */}
      <div className="mb-6">
        <Skeleton className="w-2/3 h-10 mb-3" />
        <div className="flex items-center gap-3">
          <Skeleton className="w-28 h-7 rounded-md" />
          <Skeleton className="w-32 h-7 rounded-md" />
          <div className="flex gap-1">
            <Skeleton className="w-7 h-7 rounded-md" />
            <Skeleton className="w-7 h-7 rounded-md" />
            <Skeleton className="w-7 h-7 rounded-md" />
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧内容 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 图片画廊骨架 */}
          <div className="space-y-3">
            <Skeleton className="w-full h-[400px] rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="w-20 h-14 rounded-lg" />
              <Skeleton className="w-20 h-14 rounded-lg" />
              <Skeleton className="w-20 h-14 rounded-lg" />
              <Skeleton className="w-20 h-14 rounded-lg" />
              <Skeleton className="w-20 h-14 rounded-lg" />
              <Skeleton className="w-20 h-14 rounded-lg" />
            </div>
          </div>

          {/* Tabs 骨架 */}
          <div className="space-y-4">
            <div className="flex gap-0 border-b border-white/10">
              <Skeleton className="w-24 h-10 bg-transparent" />
              <Skeleton className="w-24 h-10 bg-transparent" />
              <Skeleton className="w-24 h-10 bg-transparent" />
              <Skeleton className="w-24 h-10 bg-transparent" />
            </div>

            {/* Highlights 骨架 */}
            <div className="bg-white/[0.02] rounded-xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左列 */}
                <div className="space-y-1">
                  <Skeleton className="w-32 h-4 mb-3" />
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="w-7 h-7 rounded-md" />
                        <Skeleton className="w-24 h-4" />
                      </div>
                      <Skeleton className="w-20 h-4" />
                    </div>
                  ))}
                </div>
                {/* 右列 */}
                <div className="space-y-1">
                  <Skeleton className="w-32 h-4 mb-3" />
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="w-7 h-7 rounded-md" />
                        <Skeleton className="w-24 h-4" />
                      </div>
                      <Skeleton className="w-20 h-4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧投资面板骨架 */}
        <div className="lg:col-span-1">
          <div className="sticky top-[120px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-2xl p-6 space-y-5">
            {/* 状态徽章 */}
            <div className="flex justify-center">
              <Skeleton className="w-32 h-8 rounded-full" />
            </div>

            {/* 倒计时 */}
            <Skeleton className="w-full h-24 rounded-xl" />

            {/* 目标金额 */}
            <div className="text-center space-y-2">
              <Skeleton className="w-32 h-10 mx-auto" />
              <Skeleton className="w-24 h-4 mx-auto" />
            </div>

            {/* 进度条 */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-16 h-4" />
              </div>
              <Skeleton className="w-full h-3 rounded-full" />
            </div>

            {/* 数据卡片 */}
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>

            {/* 按钮 */}
            <Skeleton className="w-full h-[52px] rounded-xl" />
            <Skeleton className="w-3/4 h-4 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
