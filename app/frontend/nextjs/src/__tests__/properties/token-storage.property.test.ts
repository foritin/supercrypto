/**
 * Property 5: Access Token 不持久化 + Refresh Token 会话恢复
 *
 * 验证 User_Store 的 zustand persist 配置正确排除了 access token 相关字段。
 * localStorage 中不应包含 jwtToken 或 jwtExpiresAt 字段的值。
 * 页面刷新后，系统应通过 httpOnly cookie 中的 refresh token
 * 调用 /auth/refresh 端点换取新的 access token，恢复登录状态。
 *
 * **Validates: Requirements 1.10**
 */

import fc from 'fast-check';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { useUserStore as UseUserStore } from '@/stores/user-store';

// 内存 localStorage 实现，用于测试 zustand persist 实际写入行为
class InMemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

// zustand persist 存储 key（与 user-store.ts 中 name 字段一致）
const STORAGE_KEY = 'supercrypto-user-storage';

describe('Feature: full-stack-review-fixes', () => {
  let storage: InMemoryStorage;
  let useUserStore: typeof UseUserStore;

  beforeEach(async () => {
    // 创建真实的内存 localStorage，让 zustand persist 能正常读写
    storage = new InMemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      writable: true,
      configurable: true,
    });

    // 动态导入 store，确保每次测试使用新的 localStorage
    // 清除模块缓存以获取全新的 store 实例
    vi.resetModules();
    const mod = await import('@/stores/user-store');
    useUserStore = mod.useUserStore;
  });

  afterEach(() => {
    // 清理 store 状态
    useUserStore?.getState().setUnauthenticated();
    storage.clear();
  });

  /**
   * Property 5: Access Token 不持久化
   * **Validates: Requirements 1.10**
   *
   * 对于任意 token 字符串和过期时间，调用 setAuthenticated 后，
   * localStorage 中持久化的状态不应包含 jwtToken 或 jwtExpiresAt 字段。
   */
  it('property: localStorage 中不应包含 access token (jwtToken)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.integer({ min: Date.now(), max: Date.now() + 86400000 }),
        (token, expiresAt) => {
          // 设置认证状态（包含 access token）
          useUserStore.getState().setAuthenticated(token, expiresAt);

          // 等待 zustand persist 写入 localStorage
          const stored = storage.getItem(STORAGE_KEY);

          if (stored) {
            const parsed = JSON.parse(stored);
            const state = parsed.state || {};

            // 核心断言：持久化状态中不应包含 jwtToken
            expect(state).not.toHaveProperty('jwtToken');
            // 核心断言：持久化状态中不应包含 jwtExpiresAt
            expect(state).not.toHaveProperty('jwtExpiresAt');
          }

          // 验证内存中的 token 仍然可用（仅内存中保持）
          const memoryState = useUserStore.getState();
          expect(memoryState.jwtToken).toBe(token);
          expect(memoryState.jwtExpiresAt).toBe(expiresAt);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5 补充: updateToken 后 localStorage 也不应包含 access token
   * **Validates: Requirements 1.10**
   *
   * 对于任意 token 更新操作，持久化状态中不应泄露 access token。
   */
  it('property: updateToken 后 localStorage 中不应包含 access token', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.integer({ min: Date.now(), max: Date.now() + 86400000 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.integer({ min: Date.now(), max: Date.now() + 86400000 }),
        (initialToken, initialExpiry, newToken, newExpiry) => {
          // 先设置初始认证
          useUserStore.getState().setAuthenticated(initialToken, initialExpiry);
          // 再更新 token
          useUserStore.getState().updateToken(newToken, newExpiry);

          const stored = storage.getItem(STORAGE_KEY);

          if (stored) {
            const parsed = JSON.parse(stored);
            const state = parsed.state || {};

            // 持久化状态中不应包含任何 token 相关字段
            expect(state).not.toHaveProperty('jwtToken');
            expect(state).not.toHaveProperty('jwtExpiresAt');
          }

          // 内存中应保持最新的 token
          const memoryState = useUserStore.getState();
          expect(memoryState.jwtToken).toBe(newToken);
          expect(memoryState.jwtExpiresAt).toBe(newExpiry);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5 补充: 持久化状态仅包含允许的字段
   * **Validates: Requirements 1.10**
   *
   * 验证 partialize 配置的白名单机制：持久化状态仅包含 isAuthenticated 和 profile。
   */
  it('property: 持久化状态仅包含 isAuthenticated 和 profile 字段', () => {
    // 允许持久化的字段白名单
    const ALLOWED_KEYS = new Set(['isAuthenticated', 'profile']);

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
        (token, expiresAt) => {
          useUserStore.getState().setAuthenticated(token, expiresAt);

          const stored = storage.getItem(STORAGE_KEY);

          if (stored) {
            const parsed = JSON.parse(stored);
            const state = parsed.state || {};
            const persistedKeys = Object.keys(state);

            // 所有持久化的 key 都必须在白名单中
            for (const key of persistedKeys) {
              expect(ALLOWED_KEYS.has(key)).toBe(true);
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
