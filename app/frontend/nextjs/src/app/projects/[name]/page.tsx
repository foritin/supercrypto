/**
 * 项目详情页
 *
 * Story 10.7: 前端项目状态仪表盘
 * 路由: /projects/[name]
 */

'use client';

import {
  ArrowLeft,
  Database,
  Link2,
  FileText,
  Clock,
  Zap,
  CheckCircle,
  AlertTriangle,
  GitBranch,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import {
  ProjectStatusBadge,
  ContractList,
  DeploymentPlan,
  DependencyGraph,
} from '@/components/project-registry';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  useProjectStatus,
  useDeploymentOrder,
  syncProjectConfig,
  syncProjectBindings,
} from '@/hooks/use-project-status';


export default function ProjectDetailPage() {
  const params = useParams();
  const name = params.name as string;

  const [syncing, setSyncing] = useState(false);
  const [syncType, setSyncType] = useState<'config' | 'bindings' | null>(null);

  const { data: status, error, isLoading, refetch } = useProjectStatus(name, 'hardhat');
  const { data: deploymentPlan, refetch: refetchPlan } = useDeploymentOrder(name, 'hardhat');

  const handleSyncConfig = async () => {
    setSyncing(true);
    setSyncType('config');
    try {
      await syncProjectConfig(name, true);
      refetch();
      refetchPlan();
    } catch (e) {
      console.error('Sync config failed:', e);
    } finally {
      setSyncing(false);
      setSyncType(null);
    }
  };

  const handleSyncBindings = async () => {
    setSyncing(true);
    setSyncType('bindings');
    try {
      await syncProjectBindings(name, 'hardhat');
      refetch();
      refetchPlan();
    } catch (e) {
      console.error('Sync bindings failed:', e);
    } finally {
      setSyncing(false);
      setSyncType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Loading project details...</p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="p-8">
        <Link href="/projects">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Load failed</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Project not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold capitalize">
            {status.project_name}
          </h1>
          <ProjectStatusBadge readiness={status.readiness} />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSyncConfig}
            disabled={syncing && syncType === 'config'}
          >
            {syncing && syncType === 'config' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Sync Config
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncBindings}
            disabled={syncing && syncType === 'bindings'}
          >
            {syncing && syncType === 'bindings' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Sync Bindings
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card className="mb-6 bg-muted/30">
        <CardContent className="py-4">
          <p className="text-muted-foreground">{status.summary}</p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Contracts</p>
                <p className="text-2xl font-bold">{status.statistics.total_contracts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Registered</p>
                <p className="text-2xl font-bold text-blue-500">{status.statistics.registered_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">已部署</p>
                <p className="text-2xl font-bold text-purple-500">{status.statistics.deployed_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">已激活</p>
                <p className="text-2xl font-bold text-primary">{status.statistics.active_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contract List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                合约列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContractList
                contracts={status.contracts}
                deployableContracts={status.deployable_contracts}
                blockingContracts={status.blocking_contracts}
              />
            </CardContent>
          </Card>

          {/* Dependency Graph */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                依赖关系图
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden">
              <DependencyGraph projectName={name} network="hardhat" />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Deployment Plan */}
          {deploymentPlan && (
            <DeploymentPlan plan={deploymentPlan} />
          )}

          {/* Blocking Contracts */}
          {status.blocking_contracts.length > 0 && (
            <Card className="border-destructive/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  阻塞合约
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {status.blocking_contracts.map((contractName) => (
                  <div
                    key={contractName}
                    className="px-3 py-2 rounded-md bg-destructive/10 font-mono text-sm"
                  >
                    {contractName}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Deployable Contracts */}
          {status.deployable_contracts.length > 0 && (
            <Card className="border-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  可部署合约
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {status.deployable_contracts.map((contractName) => (
                  <div
                    key={contractName}
                    className="px-3 py-2 rounded-md bg-primary/10 font-mono text-sm"
                  >
                    {contractName}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
