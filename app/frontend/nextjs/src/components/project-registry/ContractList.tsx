/**
 * 合约列表组件
 *
 * Story 10.7: 前端项目状态仪表盘
 */

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContractStatusBadge } from './ProjectStatusBadge';
import { cn } from '@/lib/utils';
import type { ContractStatusInfo, DependencyType } from '@/types/project-registry';

interface ContractListProps {
  contracts: ContractStatusInfo[];
  deployableContracts: string[];
  blockingContracts: string[];
}

const typeColors: Record<DependencyType, string> = {
  primary: '#faad14',
  required: '#f5222d',
  business: '#1890ff',
  optional: '#8c8c8c',
};

const typeLabels: Record<DependencyType, string> = {
  primary: '主合约',
  required: '必须',
  business: '业务',
  optional: '可选',
};

// 依赖类型对应的 Badge 样式
const typeBadgeStyles: Record<DependencyType, string> = {
  primary: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  required: 'bg-red-500/20 text-red-400 border-red-500/40',
  business: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  optional: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

export function ContractList({
  contracts,
  deployableContracts,
  blockingContracts,
}: ContractListProps) {
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  // 按依赖类型排序
  const sortedContracts = [...contracts].sort((a, b) => {
    const order: DependencyType[] = ['primary', 'required', 'business', 'optional'];
    return order.indexOf(a.dependency_type) - order.indexOf(b.dependency_type);
  });

  return (
    <div className="flex flex-col gap-2">
      {sortedContracts.map((contract) => {
        const isDeployable = deployableContracts.includes(contract.name);
        const isBlocking = blockingContracts.includes(contract.name);
        const isExpanded = expandedContract === contract.name;

        return (
          <Card
            key={contract.name}
            className={cn(
              'p-3',
              isBlocking && 'ring-2 ring-red-500/30',
              isDeployable && !contract.is_deployed && !isBlocking && 'ring-2 ring-green-500/30'
            )}
            style={{
              borderLeft: `4px solid ${typeColors[contract.dependency_type]}`,
            }}
          >
            {/* 主行 */}
            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpandedContract(isExpanded ? null : contract.name)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <code className="font-semibold text-sm bg-muted/50 px-1.5 py-0.5 rounded">
                  {contract.name}
                </code>
                <Badge
                  variant="outline"
                  className={typeBadgeStyles[contract.dependency_type]}
                >
                  {typeLabels[contract.dependency_type]}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {isBlocking && (
                  <Badge variant="destructive">阻塞中</Badge>
                )}
                {isDeployable && !contract.is_deployed && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                    可部署
                  </Badge>
                )}
                <ContractStatusBadge status={contract.status} />
              </div>
            </div>

            {/* 展开详情 */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-white/10">
                {/* 地址 */}
                {contract.address && (
                  <div className="mb-2">
                    <span className="text-muted-foreground">地址: </span>
                    <code className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">
                      {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                    </code>
                  </div>
                )}

                {/* 缺失必须依赖 */}
                {contract.missing_required_deps.length > 0 && (
                  <div className="mb-2">
                    <span className="text-red-400">缺失必须依赖: </span>
                    <div className="inline-flex flex-wrap gap-1">
                      {contract.missing_required_deps.map((dep) => (
                        <Badge key={dep} variant="destructive" className="text-xs">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 缺失可选依赖 */}
                {contract.missing_optional_deps.length > 0 && (
                  <div className="mb-2">
                    <span className="text-yellow-400">缺失可选依赖: </span>
                    <div className="inline-flex flex-wrap gap-1">
                      {contract.missing_optional_deps.map((dep) => (
                        <Badge
                          key={dep}
                          variant="outline"
                          className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 text-xs"
                        >
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 零地址绑定 */}
                {contract.zero_bound_deps.length > 0 && (
                  <div className="mb-2">
                    <span className="text-orange-400">零地址绑定: </span>
                    <div className="inline-flex flex-wrap gap-1">
                      {contract.zero_bound_deps.map((dep) => (
                        <Badge
                          key={dep}
                          variant="outline"
                          className="bg-orange-500/20 text-orange-400 border-orange-500/40 text-xs"
                        >
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 阻塞原因 */}
                {contract.blocking_reason && (
                  <div className="p-2 bg-red-500/10 rounded text-red-400 text-sm">
                    <strong>阻塞原因:</strong> {contract.blocking_reason}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
