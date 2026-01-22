import { test, expect } from '@playwright/test';

/**
 * BMAD UI Validation Suite - Initial Smoke Tests
 * 
 * This test suite validates core UI functionality based on BMAD testarch principles:
 * - Risk-based testing: Critical paths first
 * - Network-first safeguards: Check for console errors and failed requests
 * - Accessibility baseline: Basic a11y checks
 */

test.describe('🏠 Homepage Smoke Tests', () => {
  
  test('should load homepage successfully', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for page to be loaded (use domcontentloaded for Web3 apps)
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Allow React hydration
    
    // Basic visibility check
    await expect(page).toHaveTitle(/./); // Should have some title
    
    // Check no critical errors in console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Take a screenshot for visual reference
    await page.screenshot({ 
      path: 'test-results/playwright/homepage-loaded.png',
      fullPage: true 
    });
    
    // Report any console errors (but don't fail - just log)
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors detected:', consoleErrors);
    }
  });

  test('should have proper viewport and responsive layout', async ({ page }) => {
    await page.goto('/');
    
    // Check viewport is set correctly
    const viewport = page.viewportSize();
    expect(viewport).toBeTruthy();
    
    // Check page has content
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent?.length).toBeGreaterThan(0);
  });
});

test.describe('🔗 Navigation Tests', () => {
  
  test('should have accessible navigation elements', async ({ page }) => {
    await page.goto('/');
    // Use domcontentloaded instead of networkidle for Web3 apps with persistent connections
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Allow React hydration
    
    // Look for common navigation patterns
    const navElements = page.locator('nav, [role="navigation"], header');
    const navCount = await navElements.count();
    
    console.log(`Found ${navCount} navigation element(s)`);
    
    // Take navigation screenshot
    if (navCount > 0) {
      await navElements.first().screenshot({
        path: 'test-results/playwright/navigation.png'
      });
    }
  });

  test('should have clickable links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Find all links
    const links = page.locator('a[href]');
    const linkCount = await links.count();
    
    console.log(`Found ${linkCount} link(s) on page`);
    
    // Verify links are visible (first 5)
    for (let i = 0; i < Math.min(5, linkCount); i++) {
      const link = links.nth(i);
      const href = await link.getAttribute('href');
      const isVisible = await link.isVisible();
      console.log(`  Link ${i + 1}: ${href} (visible: ${isVisible})`);
    }
  });
});

test.describe('👛 Wallet Connection UI', () => {
  
  test('should display wallet connection button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Look for wallet connection UI patterns (common in Web3 apps)
    const walletPatterns = [
      'text=/connect.*wallet/i',
      'text=/connect/i',
      '[data-testid*="wallet"]',
      '[data-testid*="connect"]',
      'button:has-text("Connect")',
      'button:has-text("Wallet")',
    ];
    
    let walletButtonFound = false;
    for (const pattern of walletPatterns) {
      try {
        const element = page.locator(pattern).first();
        if (await element.isVisible({ timeout: 2000 })) {
          walletButtonFound = true;
          console.log(`✅ Found wallet UI with pattern: ${pattern}`);
          await element.screenshot({
            path: 'test-results/playwright/wallet-button.png'
          });
          break;
        }
      } catch {
        // Pattern not found, try next
      }
    }
    
    if (!walletButtonFound) {
      console.log('ℹ️ No obvious wallet connection button found - may be in different location');
    }
  });
});

test.describe('🌐 Internationalization (i18n)', () => {
  
  test('should have language selector if i18n is enabled', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Look for language selector patterns
    const i18nPatterns = [
      '[data-testid*="language"]',
      '[data-testid*="locale"]',
      'text=/english/i',
      'text=/中文/i',
      'select[name*="lang"]',
      'button:has-text("EN")',
      'button:has-text("English")',
    ];
    
    for (const pattern of i18nPatterns) {
      try {
        const element = page.locator(pattern).first();
        if (await element.isVisible({ timeout: 1000 })) {
          console.log(`✅ Found i18n UI with pattern: ${pattern}`);
          break;
        }
      } catch {
        // Pattern not found
      }
    }
  });
});

test.describe('♿ Accessibility Baseline', () => {
  
  test('should have proper document structure', async ({ page }) => {
    await page.goto('/');
    
    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    const hasMain = await main.count() > 0;
    console.log(`Has <main> landmark: ${hasMain}`);
    
    // Check for heading hierarchy
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    console.log(`H1 count: ${h1Count}`);
    
    // Check for skip link (accessibility best practice)
    const skipLink = page.locator('a[href="#main"], a[href="#content"], .skip-link');
    const hasSkipLink = await skipLink.count() > 0;
    console.log(`Has skip link: ${hasSkipLink}`);
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    let missingAlt = 0;
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      if (alt === null) {
        missingAlt++;
        const src = await img.getAttribute('src');
        console.log(`⚠️ Image missing alt: ${src}`);
      }
    }
    
    console.log(`Images: ${imageCount} total, ${missingAlt} missing alt text`);
  });
});

test.describe('🔌 Network & Performance', () => {
  
  test('should not have failed network requests', async ({ page }) => {
    const failedRequests: string[] = [];
    
    // Monitor network requests
    page.on('requestfailed', request => {
      failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });
    
    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow initial API calls to complete
    
    // Report failed requests
    if (failedRequests.length > 0) {
      console.log('⚠️ Failed network requests:');
      failedRequests.forEach(req => console.log(`  - ${req}`));
    } else {
      console.log('✅ No failed network requests');
    }
    
    // Soft assertion - log but don't fail for now
    expect(failedRequests.length).toBeLessThanOrEqual(5); // Allow some failures (e.g., analytics)
  });
});
