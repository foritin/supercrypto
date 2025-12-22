import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '@/test/utils'
import { InstallMetaMaskModal } from './install-metamask-modal'

describe('InstallMetaMaskModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockReset()
  })

  it('should render modal when open is true', () => {
    render(<InstallMetaMaskModal open={true} onClose={mockOnClose} />)
    
    expect(screen.getByText(/install metamask wallet/i)).toBeInTheDocument()
  })

  it('should not render modal when open is false', () => {
    render(<InstallMetaMaskModal open={false} onClose={mockOnClose} />)
    
    expect(screen.queryByText(/install metamask wallet/i)).not.toBeInTheDocument()
  })

  it('should display installation steps', () => {
    render(<InstallMetaMaskModal open={true} onClose={mockOnClose} />)
    
    expect(screen.getByText(/installation steps/i)).toBeInTheDocument()
  })

  it('should display security notice', () => {
    render(<InstallMetaMaskModal open={true} onClose={mockOnClose} />)
    
    expect(screen.getByText(/security notice/i)).toBeInTheDocument()
  })

  it('should display browser options', () => {
    render(<InstallMetaMaskModal open={true} onClose={mockOnClose} />)
    
    expect(screen.getByText(/chrome/i)).toBeInTheDocument()
    expect(screen.getByText(/firefox/i)).toBeInTheDocument()
  })

  it('should call onClose when clicking "Install Later" button', () => {
    render(<InstallMetaMaskModal open={true} onClose={mockOnClose} />)
    
    const installLaterButton = screen.getByRole('button', { name: /install later/i })
    fireEvent.click(installLaterButton)
    
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('should open MetaMask download page when clicking "Go to Install"', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    
    render(<InstallMetaMaskModal open={true} onClose={mockOnClose} />)
    
    const goToInstallButton = screen.getByRole('button', { name: /go to install/i })
    fireEvent.click(goToInstallButton)
    
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('metamask'),
      '_blank',
      'noopener,noreferrer'
    )
    
    windowOpenSpy.mockRestore()
  })

  it('should display official website link', () => {
    render(<InstallMetaMaskModal open={true} onClose={mockOnClose} />)
    
    expect(screen.getByText(/official website/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /metamask\.io/i })).toHaveAttribute(
      'href',
      'https://metamask.io'
    )
  })
})

