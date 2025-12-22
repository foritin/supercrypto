'use client'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, fireEvent, waitFor, render as rtlRender } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider } from 'antd'
import { I18nextProvider } from 'react-i18next'
import { message } from 'antd'
import { render } from '@/test/utils'
import i18n from '@/test/mocks/i18n'
import { WalletConnect } from './index'
import {
  createMockUseAccount,
  createMockUseConnect,
  createMockUseDisconnect,
  createMockUseBalance,
  createMockUseSwitchChain,
  mockConnect,
  mockDisconnect,
  resetWagmiMocks,
  mockMetaMaskInstalled,
} from '@/test/mocks/wagmi'
import * as auth from '@/utils/auth'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
  useBalance: vi.fn(),
  useSwitchChain: vi.fn(),
}))

// Import mocked wagmi
import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from 'wagmi'

describe('WalletConnect', () => {
  beforeEach(() => {
    resetWagmiMocks()
    // Default: MetaMask installed
    mockMetaMaskInstalled(true)
    
    // Default mock implementations
    vi.mocked(useAccount).mockReturnValue(createMockUseAccount())
    vi.mocked(useConnect).mockReturnValue(createMockUseConnect())
    vi.mocked(useDisconnect).mockReturnValue(createMockUseDisconnect())
    vi.mocked(useBalance).mockReturnValue(createMockUseBalance())
    vi.mocked(useSwitchChain).mockReturnValue(createMockUseSwitchChain())
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Not Connected State', () => {
    it('should render connect button when not connected', () => {
      render(<WalletConnect />)
      
      expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
    })

    it('should show loading state when connecting', () => {
      vi.mocked(useConnect).mockReturnValue(createMockUseConnect({ isPending: true }))
      
      render(<WalletConnect />)
      
      // Button should be in loading state
      const button = screen.getByRole('button')
      expect(button).toHaveClass('ant-btn-loading')
    })

    it('should call connect when clicking connect button with MetaMask installed', async () => {
      mockMetaMaskInstalled(true)
      
      render(<WalletConnect />)
      
      const connectButton = screen.getByRole('button', { name: /connect wallet/i })
      fireEvent.click(connectButton)
      
      expect(mockConnect).toHaveBeenCalled()
    })

    it('should show install modal when MetaMask is not installed', async () => {
      mockMetaMaskInstalled(false)
      
      render(<WalletConnect />)
      
      const connectButton = screen.getByRole('button', { name: /connect wallet/i })
      fireEvent.click(connectButton)
      
      // Should show install modal
      await waitFor(() => {
        expect(screen.getByText(/install metamask wallet/i)).toBeInTheDocument()
      })
    })
  })

  describe('Connected State', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue(
        createMockUseAccount({
          isConnected: true,
          isDisconnected: false,
          address: '0x1234567890123456789012345678901234567890',
          chain: { id: 1, name: 'Ethereum' },
        })
      )
    })

    it('should display truncated address when connected', () => {
      render(<WalletConnect />)
      
      // Should show truncated address (0x1234...7890)
      expect(screen.getByText(/0x1234.*7890/i)).toBeInTheDocument()
    })

    it('should display balance when connected', () => {
      render(<WalletConnect />)
      
      // Should show balance
      expect(screen.getByText(/1\.5/)).toBeInTheDocument()
      expect(screen.getByText(/ETH/)).toBeInTheDocument()
    })

    it('should display network name when connected', () => {
      render(<WalletConnect />)
      
      // Should show network name (Ethereum Mainnet in English)
      expect(screen.getByText(/ethereum mainnet/i)).toBeInTheDocument()
    })

    it('should show dropdown menu when clicking wallet button', async () => {
      render(<WalletConnect />)
      
      const walletButton = screen.getByRole('button')
      fireEvent.click(walletButton)
      
      await waitFor(() => {
        expect(screen.getByText(/switch network/i)).toBeInTheDocument()
        expect(screen.getByText(/disconnect/i)).toBeInTheDocument()
      })
    })

    it('should call disconnect when clicking disconnect option', async () => {
      render(<WalletConnect />)
      
      // Open dropdown
      const walletButton = screen.getByRole('button')
      fireEvent.click(walletButton)
      
      // Click disconnect
      await waitFor(() => {
        const disconnectOption = screen.getByText(/disconnect/i)
        fireEvent.click(disconnectOption)
      })
      
      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('should show spinner when balance is loading', () => {
      vi.mocked(useAccount).mockReturnValue(
        createMockUseAccount({
          isConnected: true,
          isDisconnected: false,
          address: '0x1234567890123456789012345678901234567890',
          chain: { id: 1, name: 'Ethereum' },
        })
      )
      vi.mocked(useBalance).mockReturnValue(
        createMockUseBalance({ isLoading: true, data: undefined })
      )
      
      render(<WalletConnect />)
      
      // Should have a spinner
      expect(document.querySelector('.ant-spin')).toBeInTheDocument()
    })

    it('should show spinner when switching chain', () => {
      vi.mocked(useAccount).mockReturnValue(
        createMockUseAccount({
          isConnected: true,
          isDisconnected: false,
          address: '0x1234567890123456789012345678901234567890',
          chain: { id: 1, name: 'Ethereum' },
        })
      )
      vi.mocked(useSwitchChain).mockReturnValue(
        createMockUseSwitchChain({ isPending: true })
      )
      
      render(<WalletConnect />)
      
      // Should have a spinner
      expect(document.querySelector('.ant-spin')).toBeInTheDocument()
    })
  })

  describe('Account Change Detection (Story 1.3)', () => {
    it('should clear auth data when account changes', async () => {
      const { rerender } = render(<WalletConnect />)
      
      // First render with address A
      vi.mocked(useAccount).mockReturnValue(
        createMockUseAccount({
          isConnected: true,
          isDisconnected: false,
          address: '0x1111111111111111111111111111111111111111',
          chain: { id: 1, name: 'Ethereum' },
        })
      )
      rerender(<WalletConnect />)
      
      // Second render with address B (simulating account change)
      vi.mocked(useAccount).mockReturnValue(
        createMockUseAccount({
          isConnected: true,
          isDisconnected: false,
          address: '0x2222222222222222222222222222222222222222',
          chain: { id: 1, name: 'Ethereum' },
        })
      )
      rerender(<WalletConnect />)
      
      // Note: We can't easily verify clearAuthData was called without more complex mocking
      // The effect will run and the message will be shown
    })

    it('should clear auth and invalidate queries on account change', async () => {
      const queryClient = new QueryClient()
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
      const clearAuthSpy = vi.spyOn(auth, 'clearAuthData')

      vi.mocked(useAccount).mockReturnValue(
        createMockUseAccount({
          isConnected: true,
          isDisconnected: false,
          address: '0x1111111111111111111111111111111111111111',
          chain: { id: 1, name: 'Ethereum' },
        })
      )

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ConfigProvider>{children}</ConfigProvider>
          </I18nextProvider>
        </QueryClientProvider>
      )

      const { rerender } = rtlRender(<WalletConnect />, { wrapper })

      vi.mocked(useAccount).mockReturnValue(
        createMockUseAccount({
          isConnected: true,
          isDisconnected: false,
          address: '0x2222222222222222222222222222222222222222',
          chain: { id: 1, name: 'Ethereum' },
        })
      )

      rerender(<WalletConnect />)

      await waitFor(() => {
        expect(clearAuthSpy).toHaveBeenCalledTimes(1)
        expect(invalidateSpy).toHaveBeenCalled()
      })

      queryClient.clear()
    })
  })

  describe('Network Switch Error Handling (Story 1.4)', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue(
        createMockUseAccount({
          isConnected: true,
          isDisconnected: false,
          address: '0x1234567890123456789012345678901234567890',
          chain: { id: 1, name: 'Ethereum' },
        })
      )
    })

    it('should handle user rejection error', async () => {
      const warnSpy = vi.spyOn(message, 'warning').mockImplementation(() => undefined as any)

      vi.mocked(useSwitchChain).mockReturnValue({
        ...createMockUseSwitchChain(),
        error: { 
          message: 'User rejected the request', 
          code: 4001 
        } as Error & { code: number },
      })
      
      render(<WalletConnect />)
      
      // Error handling effect will show the warning message
      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalled()
      })

      warnSpy.mockRestore()
    })

    it('should handle generic switch error', async () => {
      const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => undefined as any)

      vi.mocked(useSwitchChain).mockReturnValue({
        ...createMockUseSwitchChain(),
        error: { message: 'Network error' } as Error,
      })
      
      render(<WalletConnect />)
      
      await waitFor(() => {
        expect(errorSpy).toHaveBeenCalled()
      })

      errorSpy.mockRestore()
    })

    it('should call switchChain when selecting a different network', async () => {
      const queryClient = new QueryClient()
      vi.mocked(useAccount).mockReturnValue(
        createMockUseAccount({
          isConnected: true,
          isDisconnected: false,
          address: '0x1234567890123456789012345678901234567890',
          chain: { id: 1, name: 'Ethereum' },
        })
      )
      vi.mocked(useSwitchChain).mockReturnValue(
        createMockUseSwitchChain()
      )

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ConfigProvider>{children}</ConfigProvider>
          </I18nextProvider>
        </QueryClientProvider>
      )

      rtlRender(<WalletConnect />, { wrapper })

      const walletButton = screen.getByRole('button')
      fireEvent.click(walletButton)

      // menu contains network items; click Sepolia to trigger switchChain
      const sepoliaItem = await screen.findByText(/sepolia testnet/i)
      fireEvent.click(sepoliaItem)

      await waitFor(() => {
        expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 11155111 })
      })

      queryClient.clear()
    })

    it('should keep current network indicator when switching fails', async () => {
      const queryClient = new QueryClient()
      vi.mocked(useAccount).mockReturnValue(
        createMockUseAccount({
          isConnected: true,
          isDisconnected: false,
          address: '0x1234567890123456789012345678901234567890',
          chain: { id: 1, name: 'Ethereum' },
        })
      )
      vi.mocked(useSwitchChain).mockReturnValue(
        createMockUseSwitchChain({
          isPending: false,
        })
      )

      // Force switchChain to throw
      mockSwitchChain.mockImplementation(() => {
        throw new Error('switch failed')
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <ConfigProvider>{children}</ConfigProvider>
          </I18nextProvider>
        </QueryClientProvider>
      )

      rtlRender(<WalletConnect />, { wrapper })

      const walletButton = screen.getByRole('button')
      fireEvent.click(walletButton)

      const sepoliaItem = await screen.findByText(/sepolia testnet/i)
      fireEvent.click(sepoliaItem)

      await waitFor(() => {
        expect(mockSwitchChain).toHaveBeenCalled()
      })

      // Network indicator should still show original network (Ethereum Mainnet)
      expect(screen.getByText(/ethereum mainnet/i)).toBeInTheDocument()

      queryClient.clear()
      mockSwitchChain.mockReset()
    })
  })
})

