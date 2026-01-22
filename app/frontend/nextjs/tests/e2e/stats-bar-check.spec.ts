import { test } from '@playwright/test';

test('check stats bar gap', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);
  
  // 找到包含 inline-flex 和 backdrop-blur 的 StatsBar 容器
  const statsContainer = page.locator('.inline-flex.backdrop-blur-\\[10px\\]').first();
  
  if (await statsContainer.isVisible()) {
    const styles = await statsContainer.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return { 
        gap: computed.gap, 
        columnGap: computed.columnGap,
        rowGap: computed.rowGap,
        padding: computed.padding,
        display: computed.display,
        className: el.className,
        width: el.offsetWidth,
        height: el.offsetHeight,
      };
    });
    console.log('\n📊 StatsBar Container Styles:');
    console.log(JSON.stringify(styles, null, 2));
    
    // 截图
    await statsContainer.screenshot({ path: 'test-results/design/stats-bar.png' });
  } else {
    // 尝试另一种方式定位
    const altContainer = page.locator('div:has-text("TOTAL VALUE LOCKED"):has-text("ACTIVE USERS")').first();
    if (await altContainer.isVisible()) {
      const styles = await altContainer.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return { 
          gap: computed.gap, 
          padding: computed.padding,
          display: computed.display,
          className: el.className,
        };
      });
      console.log('\n📊 Alt StatsBar Container Styles:');
      console.log(JSON.stringify(styles, null, 2));
    }
  }
});
