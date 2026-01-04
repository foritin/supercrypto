'use client'

import { useState, useEffect } from 'react'
import { Layout, Typography, Flex } from 'antd'
import { useTranslation } from 'react-i18next'
import { GithubOutlined, TwitterOutlined, GlobalOutlined } from '@ant-design/icons'

const { Footer: AntFooter } = Layout
const { Text, Link } = Typography

export function Footer() {
  const { t } = useTranslation()
  // 避免 hydration 不匹配，在客户端设置年份
  const [currentYear, setCurrentYear] = useState<number | null>(null)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

  return (
    <AntFooter
      style={{
        textAlign: 'center',
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-color)',
        padding: '24px 50px',
      }}
    >
      <Flex vertical gap={8} align="center">
        <Flex gap={24}>
          <Link href="https://github.com" target="_blank" style={{ color: 'var(--text-tertiary)' }}>
            <GithubOutlined style={{ fontSize: 20 }} />
          </Link>
          <Link href="https://twitter.com" target="_blank" style={{ color: 'var(--text-tertiary)' }}>
            <TwitterOutlined style={{ fontSize: 20 }} />
          </Link>
          <Link href="/" style={{ color: 'var(--text-tertiary)' }}>
            <GlobalOutlined style={{ fontSize: 20 }} />
          </Link>
        </Flex>
        <Text type="secondary" style={{ fontSize: 12 }}>
          © {currentYear ?? '2025'} ApprovePlatform. {t('footer.rights')}
        </Text>
      </Flex>
    </AntFooter>
  )
}

