# Custom Icons & Illustrations Usage Guide

## 📦 Installation

All icons and illustrations are already available in the codebase:

```typescript
import {
  // Icons
  WalletIcon,
  StakingIcon,
  PortfolioIcon,

  // Empty States
  NoAssetsIllustration,
  NoTransactionsIllustration,
  NoStakingIllustration,

  // Error Pages
  Error404Illustration,
  Error500Illustration,
  NetworkErrorIllustration,
} from '@/components/icons';
```

---

## 🎨 Custom Icons

### WalletIcon
```tsx
<WalletIcon size={64} color="#00D4AA" className="my-icon" />
```

**Props:**
- `size?: number` - Icon size in pixels (default: 64)
- `color?: string` - Primary color (default: '#00D4AA')
- `className?: string` - Additional CSS classes
- `style?: React.CSSProperties` - Inline styles

**Use Cases:**
- Navigation menu items
- Feature cards
- Dashboard widgets
- CTA buttons

### StakingIcon
```tsx
<StakingIcon size={64} color="#FFD700" />
```

**Props:** Same as WalletIcon

**Use Cases:**
- Staking section headers
- Reward displays
- Yield calculator icons

### PortfolioIcon
```tsx
<PortfolioIcon size={64} color="#1890ff" />
```

**Props:** Same as WalletIcon

**Use Cases:**
- Portfolio overview
- Asset allocation charts
- Analytics sections

---

## 🖼️ Empty State Illustrations

### NoAssetsIllustration
```tsx
<div style={{ textAlign: 'center' }}>
  <NoAssetsIllustration width={320} height={240} />
  <Title level={4}>No Assets Yet</Title>
  <Paragraph>Start by adding your first asset to your portfolio.</Paragraph>
  <Button type="primary">Add Asset</Button>
</div>
```

**Props:**
- `width?: number` - Illustration width (default: 320)
- `height?: number` - Illustration height (default: 240)
- `className?: string` - Additional CSS classes
- `style?: React.CSSProperties` - Inline styles

### NoTransactionsIllustration
```tsx
<div style={{ textAlign: 'center', padding: '40px' }}>
  <NoTransactionsIllustration />
  <Title level={4}>No Transactions</Title>
  <Paragraph>Your transaction history will appear here.</Paragraph>
</div>
```

**Props:** Same as NoAssetsIllustration

### NoStakingIllustration
```tsx
<div style={{ textAlign: 'center', padding: '40px' }}>
  <NoStakingIllustration />
  <Title level={4}>No Active Stakes</Title>
  <Paragraph>Start earning rewards by staking your assets.</Paragraph>
  <Button type="primary">Start Staking</Button>
</div>
```

**Props:** Same as NoAssetsIllustration

---

## ⚠️ Error Page Illustrations

### Error404Illustration
```tsx
// app/not-found.tsx
export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <Error404Illustration width={400} height={300} />
      <Title level={2}>Page Not Found</Title>
      <Paragraph>The page you're looking for doesn't exist.</Paragraph>
      <Button type="primary" href="/">Go Home</Button>
    </div>
  );
}
```

**Props:**
- `width?: number` - Illustration width (default: 400)
- `height?: number` - Illustration height (default: 240)
- `className?: string` - Additional CSS classes
- `style?: React.CSSProperties` - Inline styles

### Error500Illustration
```tsx
// app/error.tsx
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <Error500Illustration />
      <Title level={2}>Server Error</Title>
      <Paragraph>Something went wrong on our end. Please try again.</Paragraph>
      <Button type="primary" onClick={reset}>Retry</Button>
    </div>
  );
}
```

**Props:** Same as Error404Illustration

### NetworkErrorIllustration
```tsx
function NetworkError({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px' }}>
      <NetworkErrorIllustration />
      <Title level={2}>Connection Failed</Title>
      <Paragraph>Please check your internet connection and try again.</Paragraph>
      <Button type="primary" onClick={onRetry}>Retry</Button>
    </div>
  );
}
```

**Props:** Same as Error404Illustration

---

## 🎯 Design Philosophy

All icons and illustrations follow SuperCrypto's design language:

1. **Consistent Visual Style**
   - Gradient fills for depth
   - Subtle opacity variations
   - Rounded corners and soft edges
   - Brand-aligned color palette

2. **Semantic Colors**
   - Primary (Green/Teal): Wallet, success states
   - Gold/Yellow: Staking, rewards
   - Blue: Portfolio, information
   - Red: Errors, warnings

3. **Accessibility**
   - High contrast when needed
   - Clear visual hierarchy
   - Descriptive shapes (not just abstract)

4. **Performance**
   - Pure SVG (no external dependencies)
   - Optimized paths
   - Minimal animation overhead

---

## 🔧 Customization Examples

### Animated Icon
```tsx
'use client';
import { useState } from 'react';
import { WalletIcon } from '@/components/icons';

export function AnimatedWalletIcon() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <WalletIcon
      size={80}
      color={isHovered ? '#00FFAA' : '#00D4AA'}
      style={{
        transition: 'all 0.3s ease',
        transform: isHovered ? 'scale(1.1)' : 'scale(1)',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
}
```

### Themed Illustration
```tsx
import { NoAssetsIllustration } from '@/components/icons';
import { useTheme } from '@/hooks/useTheme';

export function ThemedEmptyState() {
  const { isDark } = useTheme();

  return (
    <NoAssetsIllustration
      style={{
        filter: isDark ? 'brightness(1.2)' : 'brightness(0.8)',
      }}
    />
  );
}
```

---

## 📝 TypeScript Support

All components are fully typed:

```typescript
import type { IconProps } from '@/components/icons/CustomIcons';

// IconProps interface:
interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}
```

---

## 🚀 Next Steps

After integrating these icons:

1. **Replace Ant Design Icons** - Gradually replace `@ant-design/icons` with custom icons
2. **Add More Icons** - Expand the icon library as needed
3. **Create Animations** - Add subtle animations using Framer Motion or CSS
4. **Icon Sprites** - Consider creating an SVG sprite for better performance at scale

---

## 📚 Resources

- Design Source: [UI/UX Enhancement Plan](../ui-ux-enhancement-plan.md)
- Component Location: `/components/icons/` and `/components/illustrations/`
- Brand Colors: See `globals.css` for color variables
