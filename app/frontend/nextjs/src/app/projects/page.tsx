/**
 * 项目列表页
 *
 * Story 10.7: 前端项目状态仪表盘
 * 路由: /projects
 */

'use client';

import { RefreshCw, FolderOpen, AlertCircle, Inbox } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ProjectCard } from '@/components/project-registry/project-card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useProjects, syncProjectConfig } from '@/hooks/use-project-status';

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { data, error, isLoading, refetch } = useProjects('hardhat');
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleSyncAll = async () => {
    if (!data?.projects) return;

    for (const project of data.projects) {
      setSyncing(project.name);
      try {
        await syncProjectConfig(project.name);
      } catch (e) {
        console.error(`Sync failed for ${project.name}:`, e);
      }
    }
    setSyncing(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('common.error')}</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : t('common.unknownError')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t('admin.projects.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('admin.projects.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            {t('admin.projects.count', { count: data?.projects.length || 0 })}
          </span>
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={!!syncing}
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? t('admin.projects.syncing', { name: syncing }) : t('admin.projects.syncAll')}
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {data?.projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('admin.projects.noProjects')}</p>
          <p className="text-muted-foreground text-xs mt-1">
            {t('admin.projects.configureHint')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
