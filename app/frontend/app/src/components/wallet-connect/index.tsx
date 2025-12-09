import { Button, Dropdown, Space, Typography, Spin, message } from 'antd'
import { WalletOutlined, DownOutlined, DisconnectOutlined, SwapOutlined } from '@ant-design/icons'
import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain } from 'wagmi'
import { supportedChains, chainNames } from '@/config/wagmi'
import { truncateAddress, formatBalance } from '@/utils/format'

const { Text } = Typography

export function WalletConnect() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()
  const { data: balance, isLoading: isBalanceLoading } = useBalance({
    address,
  })

  // 处理连接钱包
  function handleConnect() {
    const metaMaskConnector = connectors.find(c => c.name === 'MetaMask')
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector })
    } else {
      message.error('请安装 MetaMask 钱包')
    }
  }

  // 处理断开连接
  function handleDisconnect() {
    disconnect()
    message.success('已断开连接')
  }

  // 处理切换网络
  function handleSwitchChain(chainId: number) {
    switchChain({ chainId })
  }

  // 网络切换菜单项
  const networkMenuItems = supportedChains.map(c => ({
    key: c.id.toString(),
    label: (
      <Space>
        {chain?.id === c.id && <span style={{ color: '#52c41a' }}>●</span>}
        {chainNames[c.id] || c.name}
      </Space>
    ),
    onClick: () => handleSwitchChain(c.id),
    disabled: chain?.id === c.id,
  }))

  // 已连接时的下拉菜单
  const connectedMenuItems = [
    {
      key: 'network',
      label: '切换网络',
      icon: <SwapOutlined />,
      children: networkMenuItems,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'disconnect',
      label: '断开连接',
      icon: <DisconnectOutlined />,
      danger: true,
      onClick: handleDisconnect,
    },
  ]

  // 未连接状态
  if (!isConnected) {
    return (
      <Button
        type="primary"
        icon={<WalletOutlined />}
        onClick={handleConnect}
        loading={isConnecting}
      >
        连接钱包
      </Button>
    )
  }

  // 已连接状态
  return (
    <Dropdown menu={{ items: connectedMenuItems }} trigger={['click']}>
      <Button>
        <Space>
          {isSwitching ? (
            <Spin size="small" />
          ) : (
            <>
              <span style={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                backgroundColor: '#52c41a',
                display: 'inline-block'
              }} />
              <Text style={{ maxWidth: 100 }}>
                {chainNames[chain?.id || 0] || chain?.name || 'Unknown'}
              </Text>
            </>
          )}
          <Text strong>{truncateAddress(address || '')}</Text>
          {isBalanceLoading ? (
            <Spin size="small" />
          ) : (
            <Text type="secondary">
              {formatBalance(balance?.formatted)} {balance?.symbol}
            </Text>
          )}
          <DownOutlined />
        </Space>
      </Button>
    </Dropdown>
  )
}

