import { test, expect } from '@playwright/test'

/**
 * WalletConnect Button - Visual Design Comparison
 * 
 * 这个测试文件用于：
 * 1. 截图当前的钱包连接按钮
 * 2. 提供给设计师/模型分析
 * 3. 记录设计变更前后的对比
 */

test.describe('🎨 WalletConnect Button Design Analysis', () => {

  test('capture current button design - disconnected state', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // 找到钱包连接按钮
    const walletButton = page.locator('button:has-text("Connect Wallet"), button:has-text("连接钱包")')
    
    if (await walletButton.isVisible()) {
      // 截取按钮区域
      await walletButton.screenshot({
        path: 'test-results/design/wallet-button-current.png'
      })
      
      // 截取按钮及周围上下文（header）
      const header = page.locator('header').first()
      if (await header.isVisible()) {
        await header.screenshot({
          path: 'test-results/design/header-with-wallet-button.png'
        })
      }
      
      // 获取按钮的计算样式
      const styles = await walletButton.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          boxShadow: computed.boxShadow,
          width: el.offsetWidth,
          height: el.offsetHeight,
        }
      })
      
      console.log('\n📐 Current Button Styles:')
      console.log(JSON.stringify(styles, null, 2))
    }
  })

  test('capture button hover state', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    const walletButton = page.locator('button:has-text("Connect Wallet"), button:has-text("连接钱包")')
    
    if (await walletButton.isVisible()) {
      // Hover 状态截图
      await walletButton.hover()
      await page.waitForTimeout(300) // 等待动画
      
      await walletButton.screenshot({
        path: 'test-results/design/wallet-button-hover.png'
      })
      
      console.log('✅ Captured hover state')
    }
  })

  test('capture language selector design', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // 找到语言选择器（紧挨着钱包按钮）
    const langButton = page.locator('button:has-text("English"), button:has-text("中文")')
    
    if (await langButton.isVisible()) {
      await langButton.screenshot({
        path: 'test-results/design/language-selector.png'
      })
      
      // 获取样式
      const styles = await langButton.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
        }
      })
      
      console.log('\n📐 Language Selector Styles:')
      console.log(JSON.stringify(styles, null, 2))
    }
  })

  test('capture full header for context', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    // 全屏截图
    await page.screenshot({
      path: 'test-results/design/full-page-header-view.png',
      fullPage: false, // 只截取可视区域
    })
    
    // 只截取右上角区域（包含语言选择器和钱包按钮）
    const rightSection = page.locator('header').locator('div').last()
    if (await rightSection.isVisible()) {
      await rightSection.screenshot({
        path: 'test-results/design/header-right-section.png'
      })
    }
  })

  test('analyze button accessibility', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    const walletButton = page.locator('button:has-text("Connect Wallet"), button:has-text("连接钱包")')
    
    if (await walletButton.isVisible()) {
      // 检查无障碍属性
      const a11y = await walletButton.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        const bgColor = computed.backgroundColor
        const textColor = computed.color
        
        return {
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          tabIndex: el.tabIndex,
          hasIcon: el.querySelector('svg') !== null,
          textContent: el.textContent?.trim(),
          // 颜色对比度需要外部工具计算
          colors: { background: bgColor, text: textColor }
        }
      })
      
      console.log('\n♿ Accessibility Analysis:')
      console.log(JSON.stringify(a11y, null, 2))
      
      // 基本检查
      expect(a11y.tabIndex).toBeGreaterThanOrEqual(0)
    }
  })

  test('responsive design check - mobile', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    
    await page.screenshot({
      path: 'test-results/design/mobile-header-view.png',
      fullPage: false,
    })
    
    const walletButton = page.locator('button:has-text("Connect Wallet"), button:has-text("连接钱包")')
    
    if (await walletButton.isVisible()) {
      const mobileStyles = await walletButton.evaluate((el) => ({
        width: el.offsetWidth,
        height: el.offsetHeight,
        isVisible: el.offsetWidth > 0 && el.offsetHeight > 0
      }))
      
      console.log('\n📱 Mobile Button Size:')
      console.log(JSON.stringify(mobileStyles, null, 2))
    }
  })
})
