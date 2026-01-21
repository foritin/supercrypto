/**
 * 项目卡片组件
 *
 * Story 10.7: 前端项目状态仪表盘
 */

'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ProjectStatusBadge } from './ProjectStatusBadge';
import type { ProjectSummary } from '@/types/project-registry';

interface ProjectCardProps {
  project: ProjectSummary;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.name}`} className="no-underline block h-full">
      <Card className="h-full cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex justify-between items-center">
            <span className="font-semibold capitalize">{project.name}</span>
            <ProjectStatusBadge readiness={project.readiness} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {project.description && (
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">
              合约数量: <span className="font-semibold text-foreground">{project.contract_count}</span>
            </span>
            {project.primary_contract && (
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {project.primary_contract}
              </code>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
