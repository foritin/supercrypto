import { Layout, Typography, Card, Space } from 'antd'
import { SafetyOutlined, ThunderboltOutlined, GlobalOutlined } from '@ant-design/icons'
import { Header } from './components/layout/header'

const { Content, Footer } = Layout
const { Title, Paragraph, Text } = Typography

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header />
      <Content style={{ padding: '48px 24px', background: '#f5f5f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
            <Title level={1} style={{ marginBottom: 8 }}>
              欢迎使用 SuperCrypto
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 18, marginBottom: 48 }}>
              安全、便捷的加密货币管理平台
            </Paragraph>
            
            <Space size="large" wrap style={{ justifyContent: 'center' }}>
              <Card style={{ width: 300, textAlign: 'center' }} hoverable>
                <SafetyOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
                <Title level={4}>安全可靠</Title>
                <Text type="secondary">
                  采用最先进的安全技术，保护您的数字资产
                </Text>
              </Card>
              
              <Card style={{ width: 300, textAlign: 'center' }} hoverable>
                <ThunderboltOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                <Title level={4}>快速便捷</Title>
                <Text type="secondary">
                  一键连接钱包，即刻开始您的加密之旅
                </Text>
              </Card>
              
              <Card style={{ width: 300, textAlign: 'center' }} hoverable>
                <GlobalOutlined style={{ fontSize: 48, color: '#722ed1', marginBottom: 16 }} />
                <Title level={4}>多链支持</Title>
                <Text type="secondary">
                  支持以太坊主网、测试网及本地开发网络
                </Text>
              </Card>
            </Space>
          </Space>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center', background: '#fff' }}>
        <Text type="secondary">SuperCrypto ©2025 - 安全的加密货币管理平台</Text>
      </Footer>
    </Layout>
  )
}

export default App
