# UI 风格指南

> 基于 2025-2026 暗黑模式 UI 设计最佳实践

## 设计令牌系统

### 间距系统 (4px 基准)

| 变量 | 值 | 用途 |
|------|-----|------|
| `--spacing-xs` | 4px | 紧凑间距 |
| `--spacing-sm` | 8px | 小间距 |
| `--spacing-md` | 12px | 中等间距 |
| `--spacing-lg` | 16px | 标准间距 |
| `--spacing-xl` | 24px | 大间距 |
| `--spacing-2xl` | 32px | 超大间距 |
| `--spacing-3xl` | 48px | 特大间距 |

### 圆角系统

| 变量 | 值 | 用途 |
|------|-----|------|
| `--radius-sm` | 4px | 小元素 |
| `--radius-md` | 8px | 按钮、输入框 |
| `--radius-lg` | 12px | 卡片 |
| `--radius-xl` | 16px | 大卡片 |
| `--radius-2xl` | 20px | Modal |
| `--radius-3xl` | 24px | 特大容器 |

### 过渡动画

| 变量 | 值 | 用途 |
|------|-----|------|
| `--transition-fast` | 0.15s cubic-bezier(0.4, 0, 0.2, 1) | 快速交互 |
| `--transition-normal` | 0.3s cubic-bezier(0.4, 0, 0.2, 1) | 标准动画 |
| `--transition-slow` | 0.5s cubic-bezier(0.4, 0, 0.2, 1) | 慢速动画 |
| `--transition-bounce` | 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) | 弹性效果 |

## 颜色系统

### 状态颜色

使用 CSS 变量而非硬编码颜色值：

```css
/* ✅ 正确 */
color: var(--color-success);
color: var(--color-warning);
color: var(--color-error);
color: var(--color-info);

/* ❌ 错误 */
color: #52c41a;
color: #faad14;
```

### 主题颜色

```css
--color-primary: #00d4aa;
--color-primary-light: #33ffcc;
--color-primary-dark: #00a080;
--color-gold: #ffd700;
```

### 文字颜色

```css
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.70);
--text-tertiary: rgba(255, 255, 255, 0.55);
--text-muted: rgba(255, 255, 255, 0.40);
```

## 可复用组件

### SectionCard

用于 Drawer 详情面板中的信息分组：

```tsx
import { SectionCard } from '@/components/ui';

<SectionCard title="基本信息" icon={<FileText size={16} />}>
  {/* 内容 */}
</SectionCard>

<SectionCard title="错误信息" icon={<AlertTriangle size={16} />} variant="error">
  {/* 错误内容 */}
</SectionCard>
```

### InfoRow

用于显示 label: value 格式的信息：

```tsx
import { InfoRow } from '@/components/ui';

<InfoRow label="操作时间">
  2025-01-16 10:30:00
</InfoRow>
```

### CloseButton

统一的关闭按钮样式：

```tsx
import { CloseButton } from '@/components/ui';

<CloseButton onClick={onClose} />
```

## 集中式颜色配置

使用 `lib/theme-colors.ts` 管理颜色映射：

```tsx
import { getStatusColor, getStatusBgColor, STATUS_COLORS } from '@/lib/theme-colors';

// 获取状态颜色
const color = getStatusColor('success'); // 'var(--color-success)'

// 获取带透明度的背景色
const bg = getStatusBgColor('success', 0.1); // 'rgba(82, 196, 26, 0.1)'
```

## 无障碍支持

### 动画减弱

支持 `prefers-reduced-motion` 媒体查询：

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 对比度

所有文字颜色符合 WCAG AA 标准 (4.5:1 最小对比度)。

## 最佳实践

1. **使用 CSS 变量** - 避免硬编码颜色值
2. **使用设计令牌** - 保持间距和圆角一致
3. **使用可复用组件** - 减少重复代码
4. **支持暗黑/浅色模式** - 使用主题变量
5. **考虑无障碍** - 支持动画减弱和高对比度
