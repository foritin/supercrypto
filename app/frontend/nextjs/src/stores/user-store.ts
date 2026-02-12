'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type Address } from 'viem';

export type KycStatus = 
  | 'not_started' 
  | 'pending' 
  | 'submitted' 
  | 'verified' 
  | 'rejected';

export interface UserProfile {
  id: string;
  address: Address;
  email?: string;
  tag?: string;
  isAdmin: boolean;
  kycStatus: KycStatus;
  kycSubmittedAt?: number;
  kycVerifiedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Investment {
  id: string;
  assetId: string;
  assetName: string;
  amount: string;
  tokenSymbol: string;
  entryPrice: string;
  currentPrice: string;
  pnl: string;
  pnlPercentage: string;
  investedAt: number;
  lockEndDate?: number;
  status: 'active' | 'claimed' | 'locked';
}

export interface Portfolio {
  totalInvested: string;
  totalValue: string;
  totalPnl: string;
  totalPnlPercentage: string;
  investments: Investment[];
}

interface UserState {
  // Auth state
  isAuthenticated: boolean;
  jwtToken: string | null;
  jwtExpiresAt: number | null;
  
  // User profile
  profile: UserProfile | null;
  
  // Portfolio
  portfolio: Portfolio | null;
  
  // Loading states
  isLoadingProfile: boolean;
  isUpdatingProfile: boolean;
  isLoadingPortfolio: boolean;
  
  // Error states
  profileError: string | null;
  portfolioError: string | null;
  
  // Actions
  setAuthenticated: (token: string, expiresAt: number) => void;
  setUnauthenticated: () => void;
  updateToken: (token: string, expiresAt: number) => void;
  
  // Profile actions
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  setLoadingProfile: (isLoading: boolean) => void;
  setUpdatingProfile: (isUpdating: boolean) => void;
  setProfileError: (error: string | null) => void;
  
  // KYC actions
  setKycStatus: (status: KycStatus) => void;
  submitKyc: () => void;
  verifyKyc: () => void;
  rejectKyc: (reason: string) => void;
  
  // Portfolio actions
  setPortfolio: (portfolio: Portfolio | null) => void;
  updatePortfolio: (updates: Partial<Portfolio>) => void;
  addInvestment: (investment: Investment) => void;
  updateInvestment: (id: string, updates: Partial<Investment>) => void;
  removeInvestment: (id: string) => void;
  setLoadingPortfolio: (isLoading: boolean) => void;
  setPortfolioError: (error: string | null) => void;
  
  // Utility
  isTokenExpired: () => boolean;
  getKycDisplayStatus: () => string;
  canInvest: () => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      jwtToken: null,
      jwtExpiresAt: null,
      profile: null,
      portfolio: null,
      isLoadingProfile: false,
      isUpdatingProfile: false,
      isLoadingPortfolio: false,
      profileError: null,
      portfolioError: null,

      // Auth actions
      setAuthenticated: (jwtToken, jwtExpiresAt) =>
        set({ isAuthenticated: true, jwtToken, jwtExpiresAt }),

      setUnauthenticated: () =>
        set({
          isAuthenticated: false,
          jwtToken: null,
          jwtExpiresAt: null,
          profile: null,
          portfolio: null,
        }),

      updateToken: (jwtToken, jwtExpiresAt) =>
        set({ jwtToken, jwtExpiresAt }),

      // Profile actions
      setProfile: (profile) => set({ profile, profileError: null }),

      updateProfile: (updates) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        })),

      setLoadingProfile: (isLoadingProfile) => set({ isLoadingProfile }),
      setUpdatingProfile: (isUpdatingProfile) => set({ isUpdatingProfile }),
      setProfileError: (profileError) => set({ profileError }),

      // KYC actions
      setKycStatus: (kycStatus) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, kycStatus } : null,
        })),

      submitKyc: () =>
        set((state) => ({
          profile: state.profile
            ? {
                ...state.profile,
                kycStatus: 'submitted',
                kycSubmittedAt: Date.now(),
              }
            : null,
        })),

      verifyKyc: () =>
        set((state) => ({
          profile: state.profile
            ? {
                ...state.profile,
                kycStatus: 'verified',
                kycVerifiedAt: Date.now(),
              }
            : null,
        })),

      rejectKyc: (reason) =>
        set((state) => ({
          profile: state.profile
            ? {
                ...state.profile,
                kycStatus: 'rejected',
              }
            : null,
        })),

      // Portfolio actions
      setPortfolio: (portfolio) => set({ portfolio, portfolioError: null }),

      updatePortfolio: (updates) =>
        set((state) => ({
          portfolio: state.portfolio ? { ...state.portfolio, ...updates } : null,
        })),

      addInvestment: (investment) =>
        set((state) => ({
          portfolio: state.portfolio
            ? {
                ...state.portfolio,
                investments: [...state.portfolio.investments, investment],
              }
            : { 
                totalInvested: investment.amount,
                totalValue: investment.amount,
                totalPnl: '0',
                totalPnlPercentage: '0',
                investments: [investment] 
              },
        })),

      updateInvestment: (id, updates) =>
        set((state) => ({
          portfolio: state.portfolio
            ? {
                ...state.portfolio,
                investments: state.portfolio.investments.map((inv) =>
                  inv.id === id ? { ...inv, ...updates } : inv
                ),
              }
            : null,
        })),

      removeInvestment: (id) =>
        set((state) => ({
          portfolio: state.portfolio
            ? {
                ...state.portfolio,
                investments: state.portfolio.investments.filter(
                  (inv) => inv.id !== id
                ),
              }
            : null,
        })),

      setLoadingPortfolio: (isLoadingPortfolio) => set({ isLoadingPortfolio }),
      setPortfolioError: (portfolioError) => set({ portfolioError }),

      // Utility methods
      isTokenExpired: () => {
        const { jwtExpiresAt } = get();
        if (!jwtExpiresAt) return true;
        return Date.now() >= jwtExpiresAt;
      },

      getKycDisplayStatus: () => {
        const { profile } = get();
        if (!profile) return 'not_started';
        return profile.kycStatus;
      },

      canInvest: () => {
        const { isAuthenticated, profile } = get();
        if (!isAuthenticated || !profile) return false;
        return profile.kycStatus === 'verified';
      },
    }),
    {
      name: 'supercrypto-user-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // 仅持久化认证状态和用户资料，不持久化 portfolio（页面加载时刷新）
        // access token (jwtToken, jwtExpiresAt) 仅在内存中保持，不持久化到 localStorage
        // 会话持久化通过 httpOnly cookie 中的 refresh token 实现
        isAuthenticated: state.isAuthenticated,
        profile: state.profile,
      }),
    }
  )
);
