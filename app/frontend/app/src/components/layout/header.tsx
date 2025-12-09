import { Layout, Typography } from 'antd'
import { WalletConnect } from '../wallet-connect'

const { Header: AntHeader } = Layout
const { Title } = Typography

export function Header() {
  return (
    <AntHeader
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Title level={4} style={{ margin: 0, color: '#1677ff' }}>
        SuperCrypto
      </Title>
      <WalletConnect />
    </AntHeader>
  )
}

