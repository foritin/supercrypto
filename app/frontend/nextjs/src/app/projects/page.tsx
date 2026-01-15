/**
 * 项目列表页
 *
 * Story 10.7: 前端项目状态仪表盘
 * 路由: /projects
 */

'use client';

import { useProjects, syncProjectConfig } from '@/hooks/useProjectStatus';
import { ProjectCard } from '@/components/project-registry/ProjectCard';
import { Alert, Button, Spin, Row, Col, Typography, Space, Empty } from 'antd';
import { ReloadOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { useState } from 'react';

const { Title, Text } = Typography;

export default function ProjectsPage() {
  const { data, error, isLoading, refetch } = useProjects('local');
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleSyncAll = async () => {
    if (!data?.projects) return;

    for (const project of data.projects) {
      setSyncing(project.name);
      try {
        await syncProjectConfig(project.name);
      } catch (e) {
        console.error(`同步 ${project.name} 失败:`, e);
      }
    }
    setSyncing(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">加载项目列表...</Text>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <Alert
          type="error"
          message="加载失败"
          description={error instanceof Error ? error.message : '未知错误'}
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <FolderOpenOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <div>
            <Title level={3} style={{ margin: 0 }}>项目注册表</Title>
            <Text type="secondary">管理和监控项目合约部署状态</Text>
          </div>
        </Space>
        <Space>
          <Text type="secondary">共 {data?.projects.length || 0} 个项目</Text>
          <Button
            icon={<ReloadOutlined spin={!!syncing} />}
            onClick={handleSyncAll}
            loading={!!syncing}
          >
            {syncing ? `同步 ${syncing}...` : '全部同步'}
          </Button>
        </Space>
      </div>

      {/* Projects Grid */}
      {data?.projects.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              暂无项目配置<br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                请在 config.dev.yaml 中配置 project_registry.projects
              </Text>
            </span>
          }
        />
      ) : (
        <Row gutter={[16, 16]}>
          {data?.projects.map((project) => (
            <Col key={project.name} xs={24} sm={12} lg={8}>
              <ProjectCard project={project} />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
