/**
 * 全局加载页面
 * 在页面切换或初始加载时显示
 */
export default function Loading() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
        }}
      >
        {/* Logo + 动画 */}
        <div
          style={{
            width: "64px",
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #00d4aa 0%, #00a080 100%)",
            borderRadius: "16px",
            animation: "pulse-glow 2s ease-in-out infinite",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0a0f0d"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: "32px", height: "32px" }}
          >
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
        </div>

        {/* 加载文字 */}
        <div
          style={{
            fontSize: "16px",
            color: "rgba(255, 255, 255, 0.6)",
            fontWeight: 500,
          }}
        >
          Loading...
        </div>
      </div>
    </div>
  );
}
