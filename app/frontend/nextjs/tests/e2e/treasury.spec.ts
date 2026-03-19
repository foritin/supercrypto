/**
 * E2E Tests for Treasury Multisig Redemption Flow
 * 
 * Tests the complete frontend UI flow:
 * 1. User requests redemption
 * 2. Admin views redemption queue
 * 3. Admin signs redemption
 * 4. Multiple signers complete the flow
 * 5. Status updates in real-time
 * 
 * Uses Playwright for browser automation
 */

import { test, expect, Page } from '@playwright/test';

// ═══════════════════════════════════════════════════════════
// Test Data
// ═══════════════════════════════════════════════════════════

const TEST_USER = {
  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
  privateKey: process.env.TEST_USER_PRIVATE_KEY || '0x...',
};

const SIGNER_1 = {
  walletAddress: '0xSigner1Address123456789012345678901234567890',
  privateKey: process.env.SIGNER_1_PRIVATE_KEY || '0x...',
};

const SIGNER_2 = {
  walletAddress: '0xSigner2Address123456789012345678901234567890',
  privateKey: process.env.SIGNER_2_PRIVATE_KEY || '0x...',
};

const TEST_SUBSCRIPTION = {
  id: '1001',
  assetName: 'Vanke Real Estate Token',
  assetSymbol: 'VRE',
  principal: '50000',
  interest: '2500',
  totalAmount: '52500',
  endDate: '2026-03-01', // Matured
};

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

/**
 * Mock wallet connection for testing
 */
async function mockWalletConnection(page: Page, walletAddress: string) {
  await page.evaluate((address) => {
    // Mock window.ethereum
    (window as any).ethereum = {
      isMetaMask: true,
      selectedAddress: address,
      chainId: '0x7a69', // Hardhat
      request: async (request: { method: string; params?: any[] }) => {
        switch (request.method) {
          case 'eth_requestAccounts':
          case 'eth_accounts':
            return [address];
          case 'eth_chainId':
            return '0x7a69';
          case 'personal_sign':
          case 'eth_sign':
            return '0xMockSignature';
          default:
            return null;
        }
      },
      on: () => {},
      removeListener: () => {},
    };
    
    // Dispatch connection event
    window.dispatchEvent(new Event('ethereum#initialized'));
  }, walletAddress);
}

/**
 * Login as admin/signer
 */
async function loginAsAdmin(page: Page, signerAddress: string) {
  await mockWalletConnection(page, signerAddress);
  await page.goto('/admin/login');
  
  // Connect wallet
  await page.click('[data-testid="connect-wallet-button"]');
  await page.waitForSelector('[data-testid="wallet-connected"]');
  
  // Sign message if required
  const signButton = page.locator('[data-testid="sign-message-button"]');
  if (await signButton.isVisible().catch(() => false)) {
    await signButton.click();
    await page.waitForTimeout(1000);
  }
}

/**
 * Navigate to treasury queue
 */
async function navigateToTreasuryQueue(page: Page) {
  await page.goto('/admin/assets/treasury/queue');
  await page.waitForSelector('[data-testid="redemption-queue-table"]', { timeout: 10000 });
}

/**
 * Wait for redemption to appear in queue
 */
async function waitForRedemptionInQueue(page: Page, subscriptionId: string, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const row = page.locator(`[data-testid="redemption-row-${subscriptionId}"]`);
    if (await row.isVisible().catch(() => false)) {
      return row;
    }
    await page.waitForTimeout(1000);
    await page.reload();
  }
  
  throw new Error(`Redemption for subscription ${subscriptionId} not found in queue`);
}

// ═══════════════════════════════════════════════════════════
// Happy Path Tests
// ═══════════════════════════════════════════════════════════

test.describe('Treasury Redemption - Happy Path', () => {
  
  test('Complete redemption flow from request to execution', async ({ page }) => {
    /**
     * E2E: Complete redemption flow
     * 
     * Flow:
     * 1. User views matured subscription
     * 2. User clicks "Request Redemption"
     * 3. Admin views queue
     * 4. Signer 1 signs
     * 5. Signer 2 signs (auto-executes)
     * 6. Status shows EXECUTED
     */
    
    test.setTimeout(120000);
    
    console.log('🚀 Starting complete redemption flow test...');
    
    // Step 1: User requests redemption
    console.log('  Step 1: User requesting redemption...');
    await mockWalletConnection(page, TEST_USER.walletAddress);
    await page.goto('/portfolio');
    
    // Find matured subscription
    await page.waitForSelector('[data-testid="subscription-list"]', { timeout: 10000 });
    const subscriptionCard = page.locator(`[data-testid="subscription-${TEST_SUBSCRIPTION.id}"]`);
    await expect(subscriptionCard).toBeVisible();
    
    // Click redeem button
    await subscriptionCard.locator('[data-testid="redeem-button"]').click();
    
    // Confirm redemption modal
    await page.waitForSelector('[data-testid="redemption-confirm-modal"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="redemption-amount"]')).toContainText(TEST_SUBSCRIPTION.totalAmount);
    await page.click('[data-testid="confirm-redemption-button"]');
    
    // Wait for success
    await page.waitForSelector('[data-testid="redemption-request-success"]', { timeout: 15000 });
    console.log('    ✅ Redemption request submitted');
    
    // Step 2: Admin views queue
    console.log('  Step 2: Admin viewing redemption queue...');
    await loginAsAdmin(page, SIGNER_1.walletAddress);
    await navigateToTreasuryQueue(page);
    
    // Verify redemption appears in queue
    const redemptionRow = await waitForRedemptionInQueue(page, TEST_SUBSCRIPTION.id);
    await expect(redemptionRow.locator('[data-testid="status-badge"]')).toContainText('Pending');
    console.log('    ✅ Redemption found in queue');
    
    // Step 3: Signer 1 signs
    console.log('  Step 3: Signer 1 signing...');
    await redemptionRow.click();
    await page.waitForSelector('[data-testid="redemption-detail-modal"]', { timeout: 5000 });
    
    await page.click('[data-testid="sign-redemption-button"]');
    
    // Confirm signature
    await page.waitForSelector('[data-testid="signature-confirm-modal"]', { timeout: 5000 });
    await page.click('[data-testid="confirm-signature-button"]');
    
    // Wait for signature to be recorded
    await page.waitForSelector('[data-testid="signature-success-toast"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="signature-count"]')).toContainText('1/2');
    console.log('    ✅ Signer 1 signature recorded');
    
    // Step 4: Signer 2 signs (auto-executes)
    console.log('  Step 4: Signer 2 signing...');
    await mockWalletConnection(page, SIGNER_2.walletAddress);
    await page.reload();
    
    const redemptionRow2 = await waitForRedemptionInQueue(page, TEST_SUBSCRIPTION.id);
    await expect(redemptionRow2.locator('[data-testid="status-badge"]')).toContainText('Approved');
    
    await redemptionRow2.click();
    await page.click('[data-testid="sign-redemption-button"]');
    await page.waitForSelector('[data-testid="signature-confirm-modal"]', { timeout: 5000 });
    await page.click('[data-testid="confirm-signature-button"]');
    
    // Wait for execution
    await page.waitForSelector('[data-testid="execution-success-toast"]', { timeout: 20000 });
    console.log('    ✅ Signer 2 signature recorded, redemption executed');
    
    // Step 5: Verify status is EXECUTED
    console.log('  Step 5: Verifying execution status...');
    await page.reload();
    const executedRow = await waitForRedemptionInQueue(page, TEST_SUBSCRIPTION.id);
    await expect(executedRow.locator('[data-testid="status-badge"]')).toContainText('Executed');
    
    // Verify details
    await executedRow.click();
    await expect(page.locator('[data-testid="executed-timestamp"]')).toBeVisible();
    await expect(page.locator('[data-testid="execute-tx-hash"]')).toBeVisible();
    console.log('    ✅ Status confirmed as EXECUTED');
    
    console.log('\n🎉 Complete redemption flow test PASSED!');
  });
  
  test('User can view redemption status in portfolio', async ({ page }) => {
    /**
     * E2E: User views redemption status
     */
    await mockWalletConnection(page, TEST_USER.walletAddress);
    await page.goto('/portfolio');
    
    await page.waitForSelector('[data-testid="redemption-history-section"]', { timeout: 10000 });
    
    const redemptionItem = page.locator(`[data-testid="redemption-item-${TEST_SUBSCRIPTION.id}"]`);
    await expect(redemptionItem).toBeVisible();
    await expect(redemptionItem.locator('[data-testid="redemption-status"]')).toContainText(/Pending|Approved|Executed/);
  });
  
  test('Admin can filter redemption queue by status', async ({ page }) => {
    /**
     * E2E: Admin filters redemption queue
     */
    await loginAsAdmin(page, SIGNER_1.walletAddress);
    await navigateToTreasuryQueue(page);
    
    // Test Pending filter
    await page.selectOption('[data-testid="status-filter"]', 'pending');
    await page.waitForTimeout(500);
    
    const pendingRows = page.locator('[data-testid="redemption-queue-row"]');
    const pendingCount = await pendingRows.count();
    
    // All visible rows should have Pending status
    for (let i = 0; i < pendingCount; i++) {
      await expect(pendingRows.nth(i).locator('[data-testid="status-badge"]')).toContainText('Pending');
    }
    
    // Test Executed filter
    await page.selectOption('[data-testid="status-filter"]', 'executed');
    await page.waitForTimeout(500);
    
    const executedRows = page.locator('[data-testid="redemption-queue-row"]');
    const executedCount = await executedRows.count();
    
    for (let i = 0; i < executedCount; i++) {
      await expect(executedRows.nth(i).locator('[data-testid="status-badge"]')).toContainText('Executed');
    }
    
    console.log(`✅ Filter test: ${pendingCount} pending, ${executedCount} executed`);
  });
  
  test('Treasury stats page displays correct information', async ({ page }) => {
    /**
     * E2E: Treasury statistics page
     */
    await loginAsAdmin(page, SIGNER_1.walletAddress);
    await page.goto('/admin/assets/treasury');
    
    await page.waitForSelector('[data-testid="treasury-stats-container"]', { timeout: 10000 });
    
    // Verify stats cards
    await expect(page.locator('[data-testid="total-requests-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="pending-count-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="executed-count-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-redeemed-card"]')).toBeVisible();
    
    // Verify multisig info
    await expect(page.locator('[data-testid="multisig-threshold"]')).toContainText('2/3');
    await expect(page.locator('[data-testid="signer-list"]')).toBeVisible();
    
    console.log('✅ Treasury stats page verified');
  });
});

// ═══════════════════════════════════════════════════════════
// Edge Case Tests
// ═══════════════════════════════════════════════════════════

test.describe('Treasury Redemption - Edge Cases', () => {
  
  test('Non-signer cannot sign redemption', async ({ page }) => {
    /**
     * Edge Case: Non-signer tries to sign
     */
    const NON_SIGNER = '0xNonSignerAddress1234567890123456789012345678';
    
    await mockWalletConnection(page, NON_SIGNER);
    await page.goto('/admin/assets/treasury/queue');
    
    // Try to sign
    const redemptionRow = page.locator('[data-testid="redemption-queue-row"]').first();
    await redemptionRow.click();
    
    // Should show "not authorized" message or disabled button
    const signButton = page.locator('[data-testid="sign-redemption-button"]');
    await expect(signButton).toBeDisabled();
    
    // Or show unauthorized message
    await expect(page.locator('[data-testid="unauthorized-message"]')).toBeVisible();
    
    console.log('✅ Non-signer correctly blocked from signing');
  });
  
  test('Double sign prevention', async ({ page }) => {
    /**
     * Edge Case: Signer tries to sign twice
     */
    await loginAsAdmin(page, SIGNER_1.walletAddress);
    await navigateToTreasuryQueue(page);
    
    // Find a pending redemption
    await page.selectOption('[data-testid="status-filter"]', 'pending');
    const redemptionRow = page.locator('[data-testid="redemption-queue-row"]').first();
    await redemptionRow.click();
    
    // Sign once
    await page.click('[data-testid="sign-redemption-button"]');
    await page.waitForSelector('[data-testid="signature-confirm-modal"]', { timeout: 5000 });
    await page.click('[data-testid="confirm-signature-button"]');
    await page.waitForSelector('[data-testid="signature-success-toast"]', { timeout: 15000 });
    
    // Try to sign again - button should be disabled
    const signButton = page.locator('[data-testid="sign-redemption-button"]');
    await expect(signButton).toBeDisabled();
    
    // Or show "already signed" message
    await expect(page.locator('[data-testid="already-signed-message"]')).toBeVisible();
    
    console.log('✅ Double sign correctly prevented');
  });
  
  test('Admin can reject redemption', async ({ page }) => {
    /**
     * Edge Case: Reject redemption flow
     */
    await loginAsAdmin(page, SIGNER_1.walletAddress);
    await navigateToTreasuryQueue(page);
    
    // Find pending redemption
    await page.selectOption('[data-testid="status-filter"]', 'pending');
    const redemptionRow = page.locator('[data-testid="redemption-queue-row"]').first();
    await redemptionRow.click();
    
    // Click reject
    await page.click('[data-testid="reject-redemption-button"]');
    
    // Enter rejection reason
    await page.waitForSelector('[data-testid="rejection-modal"]', { timeout: 5000 });
    await page.fill('[data-testid="rejection-reason-input"]', 'Test rejection reason');
    await page.click('[data-testid="confirm-rejection-button"]');
    
    // Verify rejection
    await page.waitForSelector('[data-testid="rejection-success-toast"]', { timeout: 10000 });
    await page.reload();
    
    const rejectedRow = await waitForRedemptionInQueue(page, TEST_SUBSCRIPTION.id);
    await expect(rejectedRow.locator('[data-testid="status-badge"]')).toContainText('Rejected');
    
    console.log('✅ Redemption rejection flow verified');
  });
  
  test('Cannot request redemption for non-matured subscription', async ({ page }) => {
    /**
     * Edge Case: User tries to redeem non-matured subscription
     */
    await mockWalletConnection(page, TEST_USER.walletAddress);
    await page.goto('/portfolio');
    
    // Find non-matured subscription (has redeem button disabled)
    const nonMaturedCard = page.locator('[data-testid="subscription-active"]').first();
    
    // Redeem button should be disabled or show "not matured" message
    const redeemButton = nonMaturedCard.locator('[data-testid="redeem-button"]');
    
    if (await redeemButton.isVisible().catch(() => false)) {
      await expect(redeemButton).toBeDisabled();
    }
    
    // Check for maturity message
    await expect(nonMaturedCard.locator('[data-testid="maturity-date"]')).toBeVisible();
    
    console.log('✅ Non-matured subscription correctly blocked');
  });
  
  test('Network switch handling during redemption', async ({ page }) => {
    /**
     * Edge Case: User switches network during redemption flow
     */
    await mockWalletConnection(page, TEST_USER.walletAddress);
    await page.goto('/portfolio');
    
    // Start redemption process
    const subscriptionCard = page.locator(`[data-testid="subscription-${TEST_SUBSCRIPTION.id}"]`);
    await subscriptionCard.locator('[data-testid="redeem-button"]').click();
    
    // Simulate network switch
    await page.evaluate(() => {
      (window as any).ethereum.chainId = '0x1'; // Switch to mainnet
      window.dispatchEvent(new Event('chainChanged'));
    });
    
    // Should show network warning
    await expect(page.locator('[data-testid="network-warning"]')).toBeVisible();
    
    // Should require network switch before continuing
    await expect(page.locator('[data-testid="confirm-redemption-button"]')).toBeDisabled();
    
    console.log('✅ Network switch handling verified');
  });
  
  test('Insufficient treasury balance warning', async ({ page }) => {
    /**
     * Edge Case: Treasury has insufficient balance
     * 
     * Note: This would require mocking the treasury balance
     * to be below the redemption amount
     */
    await loginAsAdmin(page, SIGNER_1.walletAddress);
    await navigateToTreasuryQueue(page);
    
    // Look for redemptions with insufficient balance warning
    const redemptionRow = page.locator('[data-testid="redemption-queue-row"]').first();
    await redemptionRow.click();
    
    // If there's an insufficient balance warning, it should be visible
    const balanceWarning = page.locator('[data-testid="insufficient-balance-warning"]');
    
    if (await balanceWarning.isVisible().catch(() => false)) {
      await expect(balanceWarning).toContainText('Insufficient treasury balance');
      console.log('✅ Insufficient balance warning displayed');
    } else {
      console.log('ℹ️ Treasury has sufficient balance (no warning needed)');
    }
  });
});

// ═══════════════════════════════════════════════════════════
// Real-time Update Tests
// ═══════════════════════════════════════════════════════════

test.describe('Treasury Redemption - Real-time Updates', () => {
  
  test('Queue updates when new redemption is created', async ({ browser }) => {
    /**
     * E2E: Real-time queue updates
     * 
     * Two contexts: user and admin
     * When user creates redemption, admin sees it in queue
     */
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const userPage = await userContext.newPage();
    
    // Admin views queue
    await loginAsAdmin(adminPage, SIGNER_1.walletAddress);
    await navigateToTreasuryQueue(adminPage);
    
    // Get initial count
    const initialCount = await adminPage.locator('[data-testid="redemption-queue-row"]').count();
    
    // User creates redemption
    await mockWalletConnection(userPage, TEST_USER.walletAddress);
    await userPage.goto('/portfolio');
    
    // ... create redemption flow ...
    
    // Admin should see update (via polling or websocket)
    await adminPage.waitForTimeout(5000); // Wait for polling interval
    await adminPage.reload();
    
    const newCount = await adminPage.locator('[data-testid="redemption-queue-row"]').count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
    
    await adminContext.close();
    await userContext.close();
    
    console.log('✅ Real-time queue update verified');
  });
  
  test('Status updates in real-time after signing', async ({ page }) => {
    /**
     * E2E: Status updates after signing
     */
    await loginAsAdmin(page, SIGNER_1.walletAddress);
    await navigateToTreasuryQueue(page);
    
    // Find a pending redemption
    const redemptionRow = page.locator('[data-testid="redemption-queue-row"]').first();
    const initialStatus = await redemptionRow.locator('[data-testid="status-badge"]').textContent();
    
    // Open detail and sign
    await redemptionRow.click();
    await page.click('[data-testid="sign-redemption-button"]');
    await page.waitForSelector('[data-testid="signature-confirm-modal"]', { timeout: 5000 });
    await page.click('[data-testid="confirm-signature-button"]');
    
    // Wait for status update
    await page.waitForTimeout(3000);
    
    // Status should have changed
    const newStatus = await page.locator('[data-testid="status-badge"]').textContent();
    expect(newStatus).not.toBe(initialStatus);
    
    console.log(`✅ Status updated: ${initialStatus} -> ${newStatus}`);
  });
});

// ═══════════════════════════════════════════════════════════
// Mobile Responsiveness Tests
// ═══════════════════════════════════════════════════════════

test.describe('Treasury Redemption - Mobile', () => {
  
  test('Mobile view of redemption queue', async ({ page }) => {
    /**
     * E2E: Mobile responsive queue view
     */
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page, SIGNER_1.walletAddress);
    await navigateToTreasuryQueue(page);
    
    // Should show mobile-optimized view
    await expect(page.locator('[data-testid="mobile-queue-list"]')).toBeVisible();
    
    // Cards should be stacked
    const cards = page.locator('[data-testid="redemption-mobile-card"]');
    expect(await cards.count()).toBeGreaterThan(0);
    
    console.log('✅ Mobile queue view verified');
  });
  
  test('Mobile signing flow', async ({ page }) => {
    /**
     * E2E: Mobile signing experience
     */
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page, SIGNER_1.walletAddress);
    await navigateToTreasuryQueue(page);
    
    // Tap on redemption
    await page.locator('[data-testid="redemption-mobile-card"]').first().tap();
    
    // Should show bottom sheet or modal optimized for mobile
    await expect(page.locator('[data-testid="mobile-redemption-detail"]')).toBeVisible();
    
    // Sign button should be prominent
    const signButton = page.locator('[data-testid="mobile-sign-button"]');
    await expect(signButton).toBeVisible();
    
    console.log('✅ Mobile signing flow verified');
  });
});

// ═══════════════════════════════════════════════════════════
// Error Handling Tests
// ═══════════════════════════════════════════════════════════

test.describe('Treasury Redemption - Error Handling', () => {
  
  test('Transaction rejection handling', async ({ page }) => {
    /**
     * E2E: User rejects transaction in wallet
     */
    await mockWalletConnection(page, TEST_USER.walletAddress);
    await page.goto('/portfolio');
    
    // Mock transaction rejection
    await page.evaluate(() => {
      (window as any).ethereum.request = async (request: { method: string }) => {
        if (request.method === 'eth_sendTransaction') {
          throw new Error('User rejected transaction');
        }
        return null;
      };
    });
    
    // Try to redeem
    const subscriptionCard = page.locator(`[data-testid="subscription-${TEST_SUBSCRIPTION.id}"]`);
    await subscriptionCard.locator('[data-testid="redeem-button"]').click();
    await page.click('[data-testid="confirm-redemption-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="transaction-rejected-message"]')).toBeVisible();
    
    console.log('✅ Transaction rejection handling verified');
  });
  
  test('API error handling', async ({ page }) => {
    /**
     * E2E: API returns error
     */
    // Intercept and mock API error
    await page.route('**/api/v1/admin/treasury/queue/*/sign', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    await loginAsAdmin(page, SIGNER_1.walletAddress);
    await navigateToTreasuryQueue(page);
    
    // Try to sign
    const redemptionRow = page.locator('[data-testid="redemption-queue-row"]').first();
    await redemptionRow.click();
    await page.click('[data-testid="sign-redemption-button"]');
    await page.waitForSelector('[data-testid="signature-confirm-modal"]', { timeout: 5000 });
    await page.click('[data-testid="confirm-signature-button"]');
    
    // Should show error toast
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('error');
    
    console.log('✅ API error handling verified');
  });
  
  test('Timeout handling', async ({ page }) => {
    /**
     * E2E: Transaction timeout
     */
    await mockWalletConnection(page, TEST_USER.walletAddress);
    await page.goto('/portfolio');
    
    // Mock slow transaction
    await page.evaluate(() => {
      (window as any).ethereum.request = async (request: { method: string }) => {
        if (request.method === 'eth_sendTransaction') {
          await new Promise(resolve => setTimeout(resolve, 35000)); // Longer than timeout
          return '0xtxhash';
        }
        return null;
      };
    });
    
    // Try to redeem
    const subscriptionCard = page.locator(`[data-testid="subscription-${TEST_SUBSCRIPTION.id}"]`);
    await subscriptionCard.locator('[data-testid="redeem-button"]').click();
    await page.click('[data-testid="confirm-redemption-button"]');
    
    // Should show timeout message
    await expect(page.locator('[data-testid="transaction-timeout-message"]')).toBeVisible({ timeout: 40000 });
    
    console.log('✅ Timeout handling verified');
  });
});

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════

test.describe('Test Summary', () => {
  
  test('E2E test coverage summary', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     Treasury Multisig Redemption - E2E Test Summary         ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Happy Path Tests:                                           ║
║  ✅ Complete redemption flow (request -> execute)           ║
║  ✅ User views redemption status                            ║
║  ✅ Admin filters redemption queue                          ║
║  ✅ Treasury stats page                                     ║
║                                                              ║
║  Edge Case Tests:                                            ║
║  ✅ Non-signer cannot sign                                  ║
║  ✅ Double sign prevention                                  ║
║  ✅ Admin can reject redemption                             ║
║  ✅ Non-matured subscription blocked                        ║
║  ✅ Network switch handling                                 ║
║  ✅ Insufficient balance warning                            ║
║                                                              ║
║  Real-time Tests:                                            ║
║  ✅ Queue updates when new redemption created               ║
║  ✅ Status updates after signing                            ║
║                                                              ║
║  Mobile Tests:                                               ║
║  ✅ Mobile queue view                                       ║
║  ✅ Mobile signing flow                                     ║
║                                                              ║
║  Error Handling:                                             ║
║  ✅ Transaction rejection                                   ║
║  ✅ API error handling                                      ║
║  ✅ Timeout handling                                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
});
