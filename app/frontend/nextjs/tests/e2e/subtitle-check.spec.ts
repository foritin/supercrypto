import { test, expect } from '@playwright/test';

test('check subtitle alignment', async ({ page }) => {
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  // 找到 Features 区域的副标题
  const subtitle = page.locator('text=Built on blockchain technology').first();
  await expect(subtitle).toBeVisible();
  
  const styles = await subtitle.evaluate(el => {
    const computed = window.getComputedStyle(el);
    return {
      textAlign: computed.textAlign,
      marginLeft: computed.marginLeft,
      marginRight: computed.marginRight,
      width: computed.width,
      maxWidth: computed.maxWidth,
      display: computed.display,
      parentTextAlign: window.getComputedStyle(el.parentElement!).textAlign,
      inlineStyle: el.getAttribute('style'),
      className: el.className
    };
  });
  console.log('📝 Subtitle Styles:', JSON.stringify(styles, null, 2));
});
