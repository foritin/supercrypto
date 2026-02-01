'use client';

import { create } from 'zustand';

interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ModalState {
  isOpen: boolean;
  data?: Record<string, unknown>;
}

interface UIState {
  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
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
  toasts: [],
  modals: {},
  isSidebarOpen: true,
  isMobileMenuOpen: false,
  isLoadingOverlayVisible: false,
  loadingOverlayMessage: '',
  isGodMode: false,

  // Toast actions
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearToasts: () => set({ toasts: [] }),

  // Modal actions
  openModal: (name, data) =>
    set((state) => ({
      modals: {
        ...state.modals,
        [name]: { isOpen: true, data },
      },
    })),

  closeModal: (name) =>
    set((state) => ({
      modals: {
        ...state.modals,
        [name]: { isOpen: false, data: undefined },
      },
    })),

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
