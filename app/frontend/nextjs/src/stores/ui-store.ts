'use client';

import { create } from 'zustand';

/**
 * UI Store — 管理全局 UI 状态
 *
 * 自定义 Toast 系统 (addToast, removeToast, clearToasts) 已移除，
 * 项目统一使用 Sonner:
 *   import { toast } from 'sonner';
 *   toast.success('操作成功');
 *   toast.error('操作失败');
 */

interface ModalState {
  isOpen: boolean;
  data?: Record<string, unknown>;
}

interface UIState {
  // Modals
  modals: Record<string, ModalState>;
  openModal: (name: string, data?: Record<string, unknown>) => void;
  closeModal: (name: string) => void;
  isModalOpen: (name: string) => boolean;
  getModalData: (name: string) => Record<string, unknown> | undefined;

  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;

  // Mobile menu
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (isOpen: boolean) => void;

  // Loading overlay
  isLoadingOverlayVisible: boolean;
  loadingOverlayMessage: string;
  showLoadingOverlay: (message?: string) => void;
  hideLoadingOverlay: () => void;

  // God mode (dev only)
  isGodMode: boolean;
  toggleGodMode: () => void;
  setGodMode: (enabled: boolean) => void;
}

export const useUIScaffoldStore = create<UIState>()((set, get) => ({
  // Initial state
  modals: {},
  isSidebarOpen: true,
  isMobileMenuOpen: false,
  isLoadingOverlayVisible: false,
  loadingOverlayMessage: '',
  isGodMode: false,

  // Modal actions
  openModal: (name, data) => {
    const modal: ModalState = { isOpen: true };
    if (data !== undefined) {
      modal.data = data;
    }
    set((state) => ({
      modals: { ...state.modals, [name]: modal },
    }));
  },

  closeModal: (name) => {
    const modal: ModalState = { isOpen: false };
    set((state) => ({
      modals: { ...state.modals, [name]: modal },
    }));
  },

  isModalOpen: (name) => {
    return get().modals[name]?.isOpen ?? false;
  },

  getModalData: (name) => {
    return get().modals[name]?.data;
  },

  // Sidebar
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  // Mobile menu
  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  setMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),

  // Loading overlay
  showLoadingOverlay: (loadingOverlayMessage = 'Loading...') =>
    set({ isLoadingOverlayVisible: true, loadingOverlayMessage }),
  hideLoadingOverlay: () =>
    set({ isLoadingOverlayVisible: false, loadingOverlayMessage: '' }),

  // God mode
  toggleGodMode: () =>
    set((state) => ({ isGodMode: !state.isGodMode })),
  setGodMode: (isGodMode) => set({ isGodMode }),
}));
