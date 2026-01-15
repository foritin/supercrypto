/**
 * 项目卡片组件
 *
 * Story 10.7: 前端项目状态仪表盘
 */

'use client';

import Link from 'next/link';
import { Card, Typography } from 'antd';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import type { ProjectSummary } from '@/types/project-registry';

const { Text, Paragraph } = Typography;

interface ProjectCardProps {
  project: ProjectSummary;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.name}`} style={{ textDecoration: 'none' }}>
      <Card
        hoverable
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ textTransform: 'capitalize' }}>{project.name}</Text>
            <ProjectStatusBadge readiness={project.readiness} />
          </div>
        }
        style={{ height: '100%' }}
      >
        {project.description && (
          <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginBottom: 12 }}>
            {project.description}
          </Paragraph>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary">
            合约数量: <Text strong>{project.contract_count}</Text>
          </Text>
          {project.primary_contract && (
            <Text code style={{ fontSize: 12 }}>
              {project.primary_contract}
            </Text>
          )}
        </div>
      </Card>
    </Link>
  );
}
