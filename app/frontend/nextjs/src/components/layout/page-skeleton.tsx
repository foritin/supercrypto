"use client";

/**
 * 统一的页面骨架屏组件库
 * 提供多种可复用的骨架屏组件
 */

// 闪烁动画样式
const shimmerStyle: React.CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite ease-in-out",
  borderRadius: "6px",
};

// ============================================
// 基础骨架屏组件
// ============================================

interface SkeletonBoxProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

/** 基础骨架盒子 */
export function SkeletonBox({
  width,
  height,
  borderRadius,
  style,
}: SkeletonBoxProps) {
  return (
    <div
      style={{
        ...shimmerStyle,
        width: width ?? "100%",
        height: height ?? "20px",
        borderRadius: borderRadius ?? "6px",
        ...style,
      }}
    />
  );
}

/** 统计数据骨架屏 */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "24px",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "12px",
        padding: "16px 24px",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <SkeletonBox width="50px" height="24px" />
          <SkeletonBox width="35px" height="12px" />
        </div>
      ))}
    </div>
  );
}

/** 卡片骨架屏 */
export function CardSkeleton() {
  return (
    <div
      style={{
        background: "rgba(17, 25, 22, 0.6)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "16px",
        overflow: "hidden",
      }}
    >
      <SkeletonBox height="160px" borderRadius="0" />
      <div
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <SkeletonBox width="70%" height="20px" />
        <div style={{ display: "flex", gap: "12px" }}>
          <SkeletonBox height="40px" />
          <SkeletonBox height="40px" />
          <SkeletonBox height="40px" />
        </div>
        <SkeletonBox height="8px" />
        <SkeletonBox width="50%" height="24px" />
      </div>
    </div>
  );
}

/** 表格行骨架屏 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div style={{ display: "flex", gap: "16px", padding: "16px 0" }}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonBox key={i} height="20px" />
      ))}
    </div>
  );
}

/** 页面头部骨架屏 */
export function PageHeaderSkeleton({
  withStats = true,
}: {
  withStats?: boolean;
}) {
  return (
    <section
      style={{
        padding: "40px 0 32px",
        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
        marginBottom: "32px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <SkeletonBox width="80px" height="14px" />
          <SkeletonBox width="200px" height="32px" />
        </div>
        {withStats && <StatsSkeleton />}
      </div>
    </section>
  );
}

/** 筛选栏骨架屏 */
export function FilterBarSkeleton({ tabCount = 5 }: { tabCount?: number }) {
  return (
    <section
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "32px",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", gap: "8px" }}>
        {Array.from({ length: tabCount }).map((_, i) => (
          <SkeletonBox key={i} width="80px" height="36px" borderRadius="8px" />
        ))}
      </div>
      <SkeletonBox width="140px" height="36px" />
    </section>
  );
}

/** 卡片网格骨架屏 */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
        gap: "24px",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </section>
  );
}

// ============================================
// 完整页面骨架屏
// ============================================

interface PageSkeletonProps {
  variant?: "list" | "detail" | "dashboard" | "table";
}

// 列表页骨架屏（Assets、Staking）
function ListSkeleton() {
  return (
    <div
      style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 24px 80px" }}
    >
      {/* Header */}
      <section
        style={{
          padding: "40px 0 32px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "24px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ ...shimmerStyle, width: "80px", height: "14px" }} />
            <div style={{ ...shimmerStyle, width: "200px", height: "32px" }} />
          </div>
          <div
            style={{
              display: "flex",
              gap: "24px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "12px",
              padding: "16px 24px",
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <div
                  style={{ ...shimmerStyle, width: "50px", height: "24px" }}
                />
                <div
                  style={{ ...shimmerStyle, width: "35px", height: "12px" }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "32px",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                ...shimmerStyle,
                width: "80px",
                height: "36px",
                borderRadius: "8px",
              }}
            />
          ))}
        </div>
        <div style={{ ...shimmerStyle, width: "140px", height: "36px" }} />
      </section>

      {/* Cards Grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "24px",
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              background: "rgba(17, 25, 22, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <div
              style={{ ...shimmerStyle, height: "160px", borderRadius: "0" }}
            />
            <div
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div style={{ ...shimmerStyle, width: "70%", height: "20px" }} />
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ ...shimmerStyle, flex: 1, height: "40px" }} />
                <div style={{ ...shimmerStyle, flex: 1, height: "40px" }} />
                <div style={{ ...shimmerStyle, flex: 1, height: "40px" }} />
              </div>
              <div style={{ ...shimmerStyle, width: "100%", height: "8px" }} />
              <div style={{ ...shimmerStyle, width: "50%", height: "24px" }} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

// 详情页骨架屏
function DetailSkeleton() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
        {/* 左侧图片 */}
        <div style={{ flex: "1 1 500px" }}>
          <div
            style={{ ...shimmerStyle, height: "400px", borderRadius: "16px" }}
          />
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{ ...shimmerStyle, width: "80px", height: "60px" }}
              />
            ))}
          </div>
        </div>
        {/* 右侧信息 */}
        <div
          style={{
            flex: "1 1 400px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div style={{ ...shimmerStyle, width: "60%", height: "32px" }} />
          <div style={{ ...shimmerStyle, width: "40%", height: "20px" }} />
          <div style={{ ...shimmerStyle, width: "100%", height: "120px" }} />
          <div style={{ ...shimmerStyle, width: "100%", height: "48px" }} />
        </div>
      </div>
    </div>
  );
}

// 仪表盘骨架屏
function DashboardSkeleton() {
  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "40px 24px" }}>
      {/* 统计卡片 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "24px",
          marginBottom: "40px",
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: "rgba(17, 25, 22, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ ...shimmerStyle, width: "60%", height: "14px" }} />
            <div style={{ ...shimmerStyle, width: "80%", height: "32px" }} />
          </div>
        ))}
      </div>
      {/* 图表 */}
      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}
      >
        <div
          style={{
            background: "rgba(17, 25, 22, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <div
            style={{
              ...shimmerStyle,
              width: "30%",
              height: "20px",
              marginBottom: "24px",
            }}
          />
          <div style={{ ...shimmerStyle, width: "100%", height: "300px" }} />
        </div>
        <div
          style={{
            background: "rgba(17, 25, 22, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <div
            style={{
              ...shimmerStyle,
              width: "50%",
              height: "20px",
              marginBottom: "24px",
            }}
          />
          <div style={{ ...shimmerStyle, width: "100%", height: "300px" }} />
        </div>
      </div>
    </div>
  );
}

// 表格骨架屏
function TableSkeleton() {
  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "40px 24px" }}>
      <div
        style={{
          ...shimmerStyle,
          width: "200px",
          height: "32px",
          marginBottom: "24px",
        }}
      />
      <div
        style={{
          background: "rgba(17, 25, 22, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          borderRadius: "12px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ ...shimmerStyle, width: "100%", height: "40px" }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{ ...shimmerStyle, width: "100%", height: "56px" }}
          />
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = "list" }: PageSkeletonProps) {
  switch (variant) {
    case "detail":
      return <DetailSkeleton />;
    case "dashboard":
      return <DashboardSkeleton />;
    case "table":
      return <TableSkeleton />;
    default:
      return <ListSkeleton />;
  }
}
