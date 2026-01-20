/**
 * 项目详情页
 *
 * Story 10.7: 前端项目状态仪表盘
 * 路由: /projects/[name]
 */

'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import {
  useProjectStatus,
  useDeploymentOrder,
  syncProjectConfig,
  syncProjectBindings,
} from '@/hooks/useProjectStatus';
import {
  ProjectStatusBadge,
  ContractList,
  DeploymentPlan,
  DependencyGraph,
} from '@/components/project-registry';
import {
  Card,
  Button,
  Spin,
  Alert,
  Row,
  Col,
  Typography,
  Space,
  Statistic,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  LinkOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function ProjectDetailPage() {
  const params = useParams();
  const name = params.name as string;

  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState<'config' | 'bindings' | null>(null);

  const { data: status, error, isLoading, refetch } = useProjectStatus(name, 'local');
  const { data: deploymentPlan, refetch: refetchPlan } = useDeploymentOrder(name, 'local');

  const handleSyncConfig = async () => {
    setSyncing(true);
    setSyncType('config');
    try {
      await syncProjectConfig(name, true);
      refetch();
      refetchPlan();
    } catch (e) {
      console.error('同步配置失败:', e);
    } finally {
      setSyncing(false);
      setSyncType(null);
    }
  };

  const handleSyncBindings = async () => {
    setSyncing(true);
    setSyncType('bindings');
    try {
      await syncProjectBindings(name, 'local');
      refetch();
      refetchPlan();
    } catch (e) {
      console.error('同步绑定失败:', e);
    } finally {
      setSyncing(false);
      setSyncType(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">加载项目详情...</Text>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div style={{ padding: 32 }}>
        <Link href="/projects">
          <Button icon={<ArrowLeftOutlined />} style={{ marginBottom: 16 }}>
            返回项目列表
          </Button>
        </Link>
        <Alert
          type="error"
          message="加载失败"
          description={error instanceof Error ? error.message : '项目不存在'}
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Space>
          <Link href="/projects">
            <Button icon={<ArrowLeftOutlined />}>返回</Button>
          </Link>
          <Title level={3} style={{ margin: 0, textTransform: 'capitalize' }}>
            {status.project_name}
          </Title>
          <ProjectStatusBadge readiness={status.readiness} />
        </Space>

        <Space>
          <Button
            icon={<DatabaseOutlined spin={syncing && syncType === 'config'} />}
            onClick={handleSyncConfig}
            loading={syncing && syncType === 'config'}
          >
            同步配置
          </Button>
          <Button
            icon={<LinkOutlined spin={syncing && syncType === 'bindings'} />}
            onClick={handleSyncBindings}
            loading={syncing && syncType === 'bindings'}
          >
            同步绑定
          </Button>
        </Space>
      </div>

      {/* Summary */}
      <Card size="small" style={{ marginBottom: 24, background: '#fafafa' }}>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          {status.summary}
        </Paragraph>
      </Card>

      {/* Stats Grid */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总合约数"
              value={status.statistics.total_contracts}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="已注册"
              value={status.statistics.registered_count}
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="已部署"
              value={status.statistics.deployed_count}
              prefix={<ThunderboltOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="已激活"
              value={status.statistics.active_count}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content Grid */}
      <Row gutter={[24, 24]}>
        {/* Contract List */}
        <Col xs={24} lg={16}>
          <Card title={<Space><FileTextOutlined />合约列表</Space>}>
            <ContractList
              contracts={status.contracts}
              deployableContracts={status.deployable_contracts}
              blockingContracts={status.blocking_contracts}
            />
          </Card>

          {/* Dependency Graph */}
          <Card
            title={<Space><ApartmentOutlined />依赖关系图</Space>}
            style={{ marginTop: 24 }}
            bodyStyle={{ padding: 0, overflow: 'hidden' }}
          >
            <DependencyGraph projectName={name} network="local" />
          </Card>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          <Space orientation="vertical" style={{ width: '100%' }} size={16}>
            {/* Deployment Plan */}
            {deploymentPlan && (
              <DeploymentPlan plan={deploymentPlan} />
            )}

            {/* Blocking Contracts */}
            {status.blocking_contracts.length > 0 && (
              <Card
                title={<Space><WarningOutlined style={{ color: '#f5222d' }} />阻塞合约</Space>}
                size="small"
                style={{ borderColor: '#ffccc7' }}
              >
                <Space orientation="vertical" style={{ width: '100%' }}>
                  {status.blocking_contracts.map((contractName) => (
                    <Text key={contractName} code style={{ background: '#fff2f0', display: 'block', padding: '4px 8px' }}>
                      {contractName}
                    </Text>
                  ))}
                </Space>
              </Card>
            )}

            {/* Deployable Contracts */}
            {status.deployable_contracts.length > 0 && (
              <Card
                title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} />可部署合约</Space>}
                size="small"
                style={{ borderColor: '#b7eb8f' }}
              >
                <Space orientation="vertical" style={{ width: '100%' }}>
                  {status.deployable_contracts.map((contractName) => (
                    <Text key={contractName} code style={{ background: '#f6ffed', display: 'block', padding: '4px 8px' }}>
                      {contractName}
                    </Text>
                  ))}
                </Space>
              </Card>
            )}
          </Space>
        </Col>
      </Row>
    </div>
  );
}
