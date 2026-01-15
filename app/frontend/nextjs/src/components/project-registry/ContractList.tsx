/**
 * 合约列表组件
 *
 * Story 10.7: 前端项目状态仪表盘
 */

'use client';

import { useState } from 'react';
import { Card, Tag, Typography, Space } from 'antd';
import { DownOutlined, RightOutlined } from '@ant-design/icons';
import { ContractStatusBadge } from './ProjectStatusBadge';
import type { ContractStatusInfo, DependencyType } from '@/types/project-registry';

const { Text } = Typography;

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sortedContracts.map((contract) => {
        const isDeployable = deployableContracts.includes(contract.name);
        const isBlocking = blockingContracts.includes(contract.name);
        const isExpanded = expandedContract === contract.name;

        return (
          <Card
            key={contract.name}
            size="small"
            style={{
              borderLeft: `4px solid ${typeColors[contract.dependency_type]}`,
              boxShadow: isBlocking
                ? '0 0 0 2px rgba(245, 34, 45, 0.3)'
                : isDeployable && !contract.is_deployed
                ? '0 0 0 2px rgba(82, 196, 26, 0.3)'
                : undefined,
            }}
          >
            {/* 主行 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedContract(isExpanded ? null : contract.name)}
            >
              <Space>
                {isExpanded ? <DownOutlined /> : <RightOutlined />}
                <Text code strong>{contract.name}</Text>
                <Tag color={typeColors[contract.dependency_type]}>
                  {typeLabels[contract.dependency_type]}
                </Tag>
              </Space>

              <Space>
                {isBlocking && <Tag color="error">阻塞中</Tag>}
                {isDeployable && !contract.is_deployed && <Tag color="success">可部署</Tag>}
                <ContractStatusBadge status={contract.status} />
              </Space>
            </div>

            {/* 展开详情 */}
            {isExpanded && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                {/* 地址 */}
                {contract.address && (
                  <div style={{ marginBottom: 8 }}>
                    <Text type="secondary">地址: </Text>
                    <Text code style={{ fontSize: 12 }}>
                      {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                    </Text>
                  </div>
                )}

                {/* 缺失必须依赖 */}
                {contract.missing_required_deps.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <Text type="danger">缺失必须依赖: </Text>
                    <Space size={4}>
                      {contract.missing_required_deps.map((dep) => (
                        <Tag key={dep} color="error">{dep}</Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* 缺失可选依赖 */}
                {contract.missing_optional_deps.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <Text type="warning">缺失可选依赖: </Text>
                    <Space size={4}>
                      {contract.missing_optional_deps.map((dep) => (
                        <Tag key={dep} color="warning">{dep}</Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* 零地址绑定 */}
                {contract.zero_bound_deps.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <Text style={{ color: '#fa8c16' }}>零地址绑定: </Text>
                    <Space size={4}>
                      {contract.zero_bound_deps.map((dep) => (
                        <Tag key={dep} color="orange">{dep}</Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* 阻塞原因 */}
                {contract.blocking_reason && (
                  <div
                    style={{
                      padding: 8,
                      background: '#fff2f0',
                      borderRadius: 4,
                      color: '#cf1322',
                    }}
                  >
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
