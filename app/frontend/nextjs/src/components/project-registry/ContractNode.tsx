/**
 * 自定义合约节点组件
 *
 * Story 10.8: 依赖图可视化
 */

'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import type { NodeData, ContractStatus, DependencyType } from '@/types/project-registry';


// 状态颜色映射
const statusColors: Record<ContractStatus, string> = {
  not_registered: '#9ca3af',  // gray-400
  registered: '#3b82f6',      // blue-500
  deployed: '#a855f7',        // purple-500
  bound: '#eab308',           // yellow-500
  active: '#22c55e',          // green-500
  deprecated: '#f87171',      // red-400
};

// 类型边框颜色
const typeBorderColors: Record<DependencyType, string> = {
  primary: '#eab308',   // yellow-500
  required: '#ef4444',  // red-500
  business: '#3b82f6',  // blue-500
  optional: '#9ca3af',  // gray-400
};

// 类型标签
const typeLabels: Record<DependencyType, string> = {
  primary: 'PRIMARY',
  required: 'REQUIRED',
  business: 'BUSINESS',
  optional: 'OPTIONAL',
};

// 状态标签
const statusLabels: Record<ContractStatus, string> = {
  not_registered: '未注册',
  registered: '已注册',
  deployed: '已部署',
  bound: '已绑定',
  active: '已激活',
  deprecated: '已废弃',
};


interface ContractNodeProps extends NodeProps<NodeData> {}

function ContractNodeComponent({ data, selected }: ContractNodeProps) {
  const statusColor = data.status ? statusColors[data.status] : '#9ca3af';
  const borderColor = typeBorderColors[data.dependency_type] || '#9ca3af';

  return (
    <>
      {/* 输入连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 10,
          height: 10,
          background: '#9ca3af',
          border: '2px solid white',
        }}
      />

      {/* 节点内容 */}
      <div
        style={{
          padding: '8px 16px',
          borderRadius: 8,
          boxShadow: selected
            ? '0 0 0 2px #3b82f6, 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          background: 'white',
          border: `2px solid ${borderColor}`,
          borderLeftWidth: 4,
          minWidth: 180,
          transition: 'all 0.2s',
        }}
      >
        {/* 头部：状态灯 + 名称 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: statusColor,
            }}
          />
          <span style={{ fontWeight: 500, fontSize: 14 }}>{data.label}</span>
        </div>

        {/* 分隔线 */}
        <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />

        {/* 类型 | 状态 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
            color: '#6b7280',
          }}
        >
          <span style={{ fontFamily: 'monospace' }}>
            {typeLabels[data.dependency_type] || data.dependency_type}
          </span>
          <span>{data.status ? statusLabels[data.status] : '-'}</span>
        </div>

        {/* 地址 */}
        {data.address && (
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              fontFamily: 'monospace',
              color: '#9ca3af',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {data.address.slice(0, 6)}...{data.address.slice(-4)}
          </div>
        )}
      </div>

      {/* 输出连接点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 10,
          height: 10,
          background: '#9ca3af',
          border: '2px solid white',
        }}
      />
    </>
  );
}

export const ContractNode = memo(ContractNodeComponent);
