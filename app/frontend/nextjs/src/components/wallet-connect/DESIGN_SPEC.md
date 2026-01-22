# WalletConnect Button - 设计优化规格

## 📍 组件位置
- 文件: `src/components/wallet-connect/index.tsx`
- 行: 250-300 (未连接状态按钮)

## 📐 当前设计分析

### 视觉样式
```json
{
  "backgroundColor": "linear-gradient(135deg, #00D4AA 0%, #00B896 100%)",
  "textColor": "#0a0f0d (深色)",
  "borderRadius": "full (9999px)",
  "fontSize": "14px",
  "fontWeight": "600 (semibold)",
  "boxShadow": "0 0 20px rgba(0, 212, 170, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
  "size": "142px × 44px (desktop)",
  "mobileSize": "102px × 44px"
}
```

### 交互效果
- **Hover**: `scale(1.02)` + shine 动画
- **Active**: `scale(0.98)`
- **Transition**: 300ms

### 无障碍状态
- ✅ 有图标 (SVG 钱包)
- ❌ 缺少 `aria-label`
- ✅ `tabIndex: 0` (可聚焦)

---

## 🎯 设计优化方向

### 方案 A: 保持当前风格，微调
- 增加 `aria-label="Connect Wallet"`
- 优化 hover 发光效果
- 添加 focus ring

### 方案 B: 描边风格 (Outline)
```tsx
className="border-2 border-[#00D4AA] text-[#00D4AA] bg-transparent hover:bg-[#00D4AA]/10"
```

### 方案 C: 玻璃效果 (Glassmorphism)
```tsx
className="backdrop-blur-md bg-[#00D4AA]/15 border border-white/20 text-[#00D4AA]"
```

### 方案 D: 极简风格
```tsx
className="text-[#00D4AA] hover:bg-[#00D4AA]/10 rounded-lg"
```

---

## 🔧 如何调试

### 1. Playwright 截图对比
```bash
cd app/frontend/nextjs
npx playwright test tests/e2e/wallet-button-design.spec.ts --project=chromium
```
截图保存在: `test-results/design/`

### 2. 浏览器 DevTools
1. 打开 http://localhost:3000
2. 右键按钮 → 检查
3. 在 Styles 面板实时调整

### 3. 修改代码后热重载
直接修改 `src/components/wallet-connect/index.tsx` 第 250-300 行

---

## 📸 截图参考
- `test-results/design/wallet-button-current.png` - 当前按钮
- `test-results/design/wallet-button-hover.png` - Hover 状态
- `test-results/design/mobile-header-view.png` - 移动端视图
- `test-results/design/header-with-wallet-button.png` - 完整 header

---

## 💡 给模型的指引

当需要修改钱包按钮样式时：

1. **读取当前样式**: 查看 `src/components/wallet-connect/index.tsx` 第 250-300 行
2. **参考设计变体**: 查看 `wallet-connect.stories.tsx` 中的变体
3. **测试修改**: 运行 `npx playwright test tests/e2e/wallet-button-design.spec.ts`
4. **保持一致性**: 参考 `src/components/ui/button.tsx` 的设计系统

### 关键 Tailwind 类
- 主色: `#00D4AA` / `bg-[#00D4AA]`
- 渐变: `bg-gradient-to-r from-[#00D4AA] to-[#00B896]`
- 发光: `shadow-[0_0_20px_rgba(0,212,170,0.3)]`
- 圆角: `rounded-full` (胶囊) 或 `rounded-xl` (圆角)
