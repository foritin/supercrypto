'use client';

import { cn } from '@/lib/utils';

/**
 * InfiniteMarquee 组件 - 无限滚动走马灯
 * 
 * 实现双行反向滚动动画
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

export interface MarqueeItem {
  id: string;
  name: string;
  logo: string;
}

interface InfiniteMarqueeProps {
  /** 第一行数据 */
  row1Items: MarqueeItem[];
  /** 第二行数据 */
  row2Items: MarqueeItem[];
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 动画速度 (秒) */
  speed?: number;
  /** 是否暂停悬停 */
  pauseOnHover?: boolean;
  className?: string;
}

export function InfiniteMarquee({
  row1Items,
  row2Items,
  title = 'Powered by Leading Blockchains',
  subtitle = 'Multi-chain support for maximum flexibility and security',
  speed = 30,
  pauseOnHover = true,
  className,
}: InfiniteMarqueeProps) {
  return (
    <section className={cn('py-20 overflow-hidden', className)}>
      {/* Header */}
      <div className="text-center mb-12 px-6">
        <span className="text-primary text-sm font-semibold uppercase tracking-[2px] mb-4 block">
          Blockchain Ecosystem
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          {title}
        </h2>
        <p className="text-lg text-white/65 max-w-[600px] mx-auto text-center">
          {subtitle}
        </p>
      </div>

      {/* Marquee Rows - 限制在中间区域，hover 时两排同时暂停 */}
      <div className={cn(
        "max-w-[900px] mx-auto space-y-6 group/marquee",
        pauseOnHover && "hover:[&_.animate-marquee-left]:![animation-play-state:paused] hover:[&_.animate-marquee-right]:![animation-play-state:paused]"
      )}>
        {/* Row 1 - 向左滚动 */}
        <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div
            className="flex gap-6 shrink-0 animate-marquee-left pl-6"
            style={{ animationDuration: `${speed}s` }}
          >
            {row1Items.map((item, index) => (
              <MarqueeLogoItem key={`r1a-${item.id}-${index}`} item={item} />
            ))}
          </div>
          <div
            className="flex gap-6 shrink-0 animate-marquee-left pl-6"
            style={{ animationDuration: `${speed}s` }}
          >
            {row1Items.map((item, index) => (
              <MarqueeLogoItem key={`r1b-${item.id}-${index}`} item={item} />
            ))}
          </div>
        </div>

        {/* Row 2 - 向右滚动 */}
        <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div
            className="flex gap-6 shrink-0 animate-marquee-right pl-6"
            style={{ animationDuration: `${speed}s` }}
          >
            {row2Items.map((item, index) => (
              <MarqueeLogoItem key={`r2a-${item.id}-${index}`} item={item} />
            ))}
          </div>
          <div
            className="flex gap-6 shrink-0 animate-marquee-right pl-6"
            style={{ animationDuration: `${speed}s` }}
          >
            {row2Items.map((item, index) => (
              <MarqueeLogoItem key={`r2b-${item.id}-${index}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Logo 项组件
 * Requirements: 5.2, 5.3, 5.4, 5.6
 */
function MarqueeLogoItem({ item }: { item: MarqueeItem }) {
  return (
    <div
      className={cn(
        // 深灰半透明容器 - Requirements: 5.3
        'flex-shrink-0 w-[100px] h-[100px] rounded-full',
        'bg-[rgba(255,255,255,0.08)] border border-white/10',
        'flex items-center justify-center',
        // Hover 效果 - Requirements: 5.4
        'transition-all duration-300',
        'hover:-translate-y-1 hover:bg-[rgba(255,255,255,0.12)]',
        'hover:border-white/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]',
        'group cursor-pointer'
      )}
      title={item.name}
    >
      { }
      <img
        src={item.logo}
        alt={item.name}
        className={cn(
          'w-12 h-12 object-contain',
          // 默认状态: 低透明度 + 灰度
          'opacity-50 grayscale brightness-150',
          // Hover 点亮: 显示真实颜色
          'group-hover:opacity-100 group-hover:grayscale-0 group-hover:brightness-100',
          'transition-all duration-300'
        )}
      />
    </div>
  );
}
