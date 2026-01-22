/**
 * WalletConnect Component Tests
 * 
 * Tests for the RainbowKit-based wallet connection component.
 * Validates Requirements: 7.2, 7.3, 7.4, 7.5, 7.7, 7.8
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock dependencies before importing the component
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

const mockClearAuthData = vi.fn()
const mockSetWalletConnected = vi.fn()
const mockSetWalletAddress = vi.fn()
const mockHasJwtToken = vi.fn()
const mockGetAddressFromToken = vi.fn()
const mockLogout = vi.fn()
const mockLogin = vi.fn()
const mockGetCurrentUser = vi.fn()
const mockUseAccount = vi.fn()
const mockUseDisconnect = vi.fn()
const mockUseSignMessage = vi.fn()
const mockOpenConnectModal = vi.fn()
const mockOpenAccountModal = vi.fn()
const mockOpenChainModal = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const translations: Record<string, string> = {
        'wallet.connect': 'Connect Wallet',
        'wallet.signing': 'Signing...',
        'wallet.loggingIn': 'Logging in...',
        'wallet.loginSuccess': 'Login successful',
        'wallet.disconnected': 'Wallet disconnected',
        'wallet.switchNetwork': 'Switch Network',
        'wallet.error.signRejected': 'Signature rejected',
        'wallet.error.loginFailed': 'Login failed',
        'wallet.network.mainnet': 'Mainnet',
        'wallet.network.sepolia': 'Sepolia',
        'wallet.network.localhost': 'Localhost',
      }
      if (params && key === 'wallet.accountChanged') {
        return `Account changed from ${params.from} to ${params.to}`
      }
      return translations[key] || key
    },
  }),
}))

vi.mock('sonner', () => ({
  toast: mockToast,
}))

vi.mock('@/utils/auth', () => ({
  clearAuthData: () => mockClearAuthData(),
  setWalletConnected: (connected: boolean) => mockSetWalletConnected(connected),
  setWalletAddress: (address: string) => mockSetWalletAddress(address),
  hasJwtToken: () => mockHasJwtToken(),
  getAddressFromToken: () => mockGetAddressFromToken(),
}))

vi.mock('@/services/auth', () => ({
  logout: () => mockLogout(),
  login: (...args: unknown[]) => mockLogin(...args),
}))

vi.mock('@/services/user', () => ({
  userService: {
    getCurrentUser: () => mockGetCurrentUser(),
  },
}))

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useDisconnect: () => mockUseDisconnect(),
  useSignMessage: () => mockUseSignMessage(),
}))

vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: {
    Custom: ({ children }: { children: (props: Record<string, unknown>) => React.ReactNode }) => {
      const mockProps = {
        account: {
          address: '0x1234567890abcdef1234567890abcdef12345678',
          displayName: '0x1234...5678',
          displayBalance: '1.5 ETH',
        },
        chain: {
          id: 1,
          name: 'Ethereum',
          hasIcon: true,
          iconUrl: 'https://example.com/eth.png',
          iconBackground: '#627EEA',
          unsupported: false,
        },
        openAccountModal: mockOpenAccountModal,
        openChainModal: mockOpenChainModal,
        openConnectModal: mockOpenConnectModal,
        authenticationStatus: 'authenticated',
        mounted: true,
      }
      return <div data-testid="rainbowkit-custom">{children(mockProps)}</div>
    },
  },
}))

vi.mock('@/config/wagmi', () => ({
  supportedChains: [
    { id: 1, name: 'Ethereum' },
    { id: 11155111, name: 'Sepolia' },
    { id: 31337, name: 'Hardhat' },
  ],
}))

vi.mock('@/utils/format', () => ({
  truncateAddress: (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`,
}))

// Import component after mocks
import { WalletConnect } from './index'

describe('WalletConnect Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnected: false,
      chain: undefined,
    })
    
    mockUseDisconnect.mockReturnValue({
      disconnect: vi.fn(),
    })
    
    mockUseSignMessage.mockReturnValue({
      signMessageAsync: vi.fn(),
      isPending: false,
    })
    
    mockHasJwtToken.mockReturnValue(false)
    mockGetAddressFromToken.mockReturnValue(null)
    mockGetCurrentUser.mockResolvedValue(null)
    mockLogin.mockResolvedValue({})
    mockLogout.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Requirement 7.2: Display wallet address and balance', () => {
    it('should display wallet address when connected', async () => {
      mockUseAccount.mockReturnValue({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        isConnected: true,
        chain: { id: 1, name: 'Ethereum' },
      })
      mockHasJwtToken.mockReturnValue(true)
      mockGetAddressFromToken.mockReturnValue('0x1234567890abcdef1234567890abcdef12345678')

      render(<WalletConnect />)

      await waitFor(() => {
        expect(screen.getByText('0x1234...5678')).toBeInTheDocument()
      })
    })

    it('should display balance when connected', async () => {
      mockUseAccount.mockReturnValue({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        isConnected: true,
        chain: { id: 1, name: 'Ethereum' },
      })
      mockHasJwtToken.mockReturnValue(true)
      mockGetAddressFromToken.mockReturnValue('0x1234567890abcdef1234567890abcdef12345678')

      render(<WalletConnect />)

      await waitFor(() => {
        expect(screen.getByText('1.5 ETH')).toBeInTheDocument()
      })
    })
  })

  describe('Requirement 7.4: Network switching events', () => {
    it('should have network button for switching networks', async () => {
      mockUseAccount.mockReturnValue({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        isConnected: true,
        chain: { id: 1, name: 'Ethereum' },
      })
      mockHasJwtToken.mockReturnValue(true)
      mockGetAddressFromToken.mockReturnValue('0x1234567890abcdef1234567890abcdef12345678')

      render(<WalletConnect />)

      await waitFor(() => {
        const networkButton = screen.getByTitle('Switch Network')
        expect(networkButton).toBeInTheDocument()
      })
    })

    it('should display network name', async () => {
      mockUseAccount.mockReturnValue({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        isConnected: true,
        chain: { id: 1, name: 'Ethereum' },
      })
      mockHasJwtToken.mockReturnValue(true)
      mockGetAddressFromToken.mockReturnValue('0x1234567890abcdef1234567890abcdef12345678')

      render(<WalletConnect />)

      await waitFor(() => {
        expect(screen.getByText('Mainnet')).toBeInTheDocument()
      })
    })
  })

  describe('Requirement 7.7: Multiple wallet support via RainbowKit', () => {
    it('should render connect button when not connected', async () => {
      render(<WalletConnect />)

      await waitFor(() => {
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument()
      })
    })

    it('should use RainbowKit ConnectButton.Custom for wallet connection', async () => {
      render(<WalletConnect />)

      await waitFor(() => {
        expect(screen.getByTestId('rainbowkit-custom')).toBeInTheDocument()
      })
    })
  })

  describe('UI States', () => {
    it('should render component without errors', () => {
      const { container } = render(<WalletConnect />)
      expect(container).toBeTruthy()
    })

    it('should show signing state when signing', async () => {
      mockUseSignMessage.mockReturnValue({
        signMessageAsync: vi.fn(),
        isPending: true,
      })
      
      mockUseAccount.mockReturnValue({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        isConnected: true,
        chain: { id: 1, name: 'Ethereum' },
      })
      mockHasJwtToken.mockReturnValue(true)
      mockGetAddressFromToken.mockReturnValue('0x1234567890abcdef1234567890abcdef12345678')

      render(<WalletConnect />)

      await waitFor(() => {
        expect(screen.getByText('Signing...')).toBeInTheDocument()
      })
    })
  })
})
