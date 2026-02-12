'use client';

import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Dagre from '@dagrejs/dagre';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { contractGraphService, type GraphNode } from '@/services/contract-graph';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertCircle, Inbox } from 'lucide-react';

// ============================================
// Dark Fintech Theme - Web3 配色方案
// ============================================
const THEME = {
  // 背景
  bg: {
    canvas: '#0a0a14',
    node: 'rgba(16, 18, 30, 0.95)',
    glass: 'rgba(22, 27, 45, 0.85)',
  },
  // 主色调 - Indigo/Purple 系
  accent: {
    primary: '#818CF8',      // Indigo-400
    primaryGlow: 'rgba(129, 140, 248, 0.4)',
    secondary: '#34D399',    // Emerald-400 - 成功
    secondaryGlow: 'rgba(52, 211, 153, 0.3)',
    warning: '#FBBF24',      // Amber-400 - 警告
    warningGlow: 'rgba(251, 191, 36, 0.3)',
    error: '#F87171',        // Red-400
    muted: '#6B7280',        // Gray-500
  },
  // 边框
  border: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    normal: 'rgba(255, 255, 255, 0.12)',
    accent: 'rgba(129, 140, 248, 0.4)',
  },
  // 文字
  text: {
    primary: '#F8FAFC',
    secondary: 'rgba(248, 250, 252, 0.7)',
    muted: 'rgba(248, 250, 252, 0.45)',
  },
};

// 状态配色
const STATUS_COLORS: Record<string, { color: string; glow: string }> = {
  ready: { color: THEME.accent.secondary, glow: THEME.accent.secondaryGlow },
  not_registered: { color: THEME.accent.warning, glow: THEME.accent.warningGlow },
  not_deployed: { color: THEME.accent.muted, glow: 'transparent' },
  missing_deps: { color: THEME.accent.error, glow: 'rgba(248, 113, 113, 0.3)' },
};

// 状态文字映射
const STATUS_TEXT: Record<string, string> = {
  ready: 'Ready',
  not_registered: 'Not Registered',
  not_deployed: 'Not Deployed',
  missing_deps: 'Missing Deps',
};

// ============================================
// 自定义合约节点 - Turbo Flow 风格
// ============================================
function ContractNode({ data }: { data: GraphNode }) {
  const status = STATUS_COLORS[data.status] || STATUS_COLORS.not_deployed;
  const statusText = STATUS_TEXT[data.status] || 'Unknown';
  const isGlobal = data.project === 'common' || !data.project;

  return (
    <TooltipProvider>
      <div className="contract-node">
        {/* 发光边框效果 - 使用状态颜色 */}
        <div 
          className="node-glow"
          style={{ 
            background: `linear-gradient(135deg, ${status.color}30 0%, transparent 60%)`,
          }} 
        />
        
        {/* 主体内容 */}
        <div 
          className="node-content"
          style={{
            borderColor: `${status.color}50`,
          }}
        >
          {/* Handles */}
          <Handle 
            type="target" 
            position={Position.Top} 
            className="node-handle"
            style={{ background: status.color }}
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="node-handle"
            style={{ background: status.color }}
          />

          {/* 顶部：状态条 */}
          <div 
            className="status-bar"
            style={{ 
              background: `linear-gradient(90deg, ${status.color} 0%, ${status.color}60 100%)`,
            }}
          >
            <div 
              className="status-dot"
              style={{ background: status.color }}
            />
            <span className="status-text">{statusText}</span>
          </div>

          {/* 合约名称 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="node-name">{data.label}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{data.label}</p>
            </TooltipContent>
          </Tooltip>

          {/* 标签行 */}
          <div className="node-tags">
            <span 
              className="tag project-tag"
              style={{ 
                background: isGlobal 
                  ? 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)' 
                  : 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
              }}
            >
              {isGlobal ? 'GLOBAL' : data.project?.toUpperCase()}
            </span>
            {data.module && (
              <span className="tag module-tag">{data.module}</span>
            )}
          </div>

          {/* 地址 */}
          {data.address && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="node-address">
                  {data.address.slice(0, 8)}...{data.address.slice(-6)}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono">{data.address}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <style>{`
          .contract-node {
            position: relative;
            width: 220px;
            cursor: pointer;
          }
          .node-glow {
            position: absolute;
            inset: -1px;
            border-radius: 14px;
            z-index: 0;
          }
          .node-content {
            position: relative;
            padding: 14px 16px;
            border-radius: 12px;
            background: ${THEME.bg.node};
            border: 1px solid ${THEME.border.normal};
            backdrop-filter: blur(12px);
            z-index: 1;
            transition: all 0.2s ease;
          }
          .contract-node:hover .node-content {
            border-color: ${THEME.accent.primary};
            box-shadow: 0 0 24px ${THEME.accent.primaryGlow};
            transform: translateY(-2px);
          }
          .node-handle {
            width: 8px !important;
            height: 8px !important;
            border: none !important;
            transition: transform 0.2s;
          }
          .contract-node:hover .node-handle {
            transform: scale(1.3);
          }
          .status-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            border-radius: 6px;
            margin: -14px -16px 12px -16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
          }
          .status-text {
            font-size: 11px;
            font-weight: 600;
            color: rgba(255,255,255,0.9);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .node-name {
            font-size: 14px;
            font-weight: 600;
            color: ${THEME.text.primary};
            margin-bottom: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .node-tags {
            display: flex;
            gap: 6px;
            margin-bottom: 10px;
            flex-wrap: wrap;
          }
          .tag {
            font-size: 10px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .project-tag {
            color: #fff;
          }
          .module-tag {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid ${THEME.border.subtle};
            color: ${THEME.text.secondary};
          }
          .node-address {
            font-size: 11px;
            font-family: 'SF Mono', 'Fira Code', monospace;
            color: ${THEME.text.muted};
            padding: 4px 8px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            cursor: pointer;
          }
          .node-address:hover {
            color: ${THEME.text.secondary};
            background: rgba(0, 0, 0, 0.3);
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}

const nodeTypes: NodeTypes = {
  contract: ContractNode,
};

// ============================================
// Dagre 布局
// ============================================
function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 80,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: 220, height: 130 });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 110, y: pos.y - 65 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// ============================================
// 主组件
// ============================================
interface ContractDependencyTreeProps {
  onContractClick?: (contractId: string) => void;
  showNotRegistered?: boolean;
}

export function ContractDependencyTree({ onContractClick, showNotRegistered = true }: ContractDependencyTreeProps) {
  const { t } = useTranslation();

  const { data: graphData, isLoading, error } = useQuery({
    queryKey: ['contract-dependency-graph'],
    queryFn: contractGraphService.getDependencyGraph,
  });

  // DEBUG: 检查 API 返回的数据
  if (graphData) {
    console.log('[DEBUG] graphData.nodes USDT/USDC:', 
      graphData.nodes.filter(n => ['USDT', 'USDC'].includes(n.id))
        .map(n => ({ id: n.id, status: n.status, type: n.type }))
    );
  }

  // 构建节点和边
  const { layoutedNodes, layoutedEdges } = useMemo(() => {
    if (!graphData || graphData.nodes.length === 0) {
      return { layoutedNodes: [], layoutedEdges: [] };
    }

    // 根据 showNotRegistered 过滤节点（包括未注册和已解绑的）
    let filteredNodes = graphData.nodes;
    
    // 过滤未注册的节点（包括 not_registered 状态和已删除的）
    if (!showNotRegistered) {
      filteredNodes = filteredNodes.filter(node => node.status !== 'not_registered' && !node.isDeleted);
    }

    // 获取过滤后的节点 ID 集合
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

    // 直接使用过滤后的合约节点，不再创建 Group Header
    const nodes: Node[] = filteredNodes.map((node) => ({
      id: node.id,
      type: 'contract',
      position: { x: 0, y: 0 },
      data: node as unknown as Record<string, unknown>,
    }));

    // 构建依赖边（只保留两端节点都存在的边）
    const edges: Edge[] = graphData.edges
      .filter(edge => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target))
      .map((edge, idx) => {
        const isRegistered = edge.status === 'registered';
        const edgeColor = isRegistered ? THEME.accent.secondary : THEME.accent.warning;

        return {
          id: `dep-${idx}`,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          label: edge.key,
          labelStyle: { 
            fontSize: 10, 
            fontWeight: 500,
            fill: edgeColor,
          },
          labelBgStyle: { 
            fill: THEME.bg.node, 
            fillOpacity: 0.95,
          },
          labelBgPadding: [6, 10] as [number, number],
          labelBgBorderRadius: 6,
          style: {
            stroke: edgeColor,
            strokeWidth: 2,
            strokeDasharray: isRegistered ? undefined : '6 4',
          },
          animated: !isRegistered,
          markerEnd: {
            type: 'arrowclosed' as const,
            color: edgeColor,
            width: 18,
            height: 18,
          },
        };
      });

    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, 'TB');
    return { layoutedNodes: ln, layoutedEdges: le };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, showNotRegistered]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    if (layoutedNodes.length > 0) {
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onContractClick?.(node.id);
    },
    [onContractClick]
  );

  // Loading State - 使用 shadcn/ui Skeleton
  if (isLoading) {
    return (
      <div className="tree-container tree-loading">
        <div className="flex flex-col gap-4 w-full max-w-md">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
        <style>{containerStyles}</style>
      </div>
    );
  }

  // Error State - 使用 shadcn/ui Alert
  if (error) {
    return (
      <div className="tree-container flex items-center justify-center p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('admin.contracts.tree.loadFailed')}</AlertTitle>
          <AlertDescription>
            {(error as Error).message}
          </AlertDescription>
        </Alert>
        <style>{containerStyles}</style>
      </div>
    );
  }

  // Empty State - 使用自定义空状态
  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="tree-container tree-empty">
        <div className="flex flex-col items-center justify-center gap-4">
          <Inbox className="h-16 w-16" style={{ color: THEME.text.muted }} />
          <p className="text-sm" style={{ color: THEME.text.muted }}>
            {t('admin.contracts.tree.noData')}
          </p>
        </div>
        <style>{containerStyles}</style>
      </div>
    );
  }

  // 统计信息
  const globalCount = graphData.nodes.filter(n => n.project === 'common' || !n.project).length;
  const projectCount = graphData.nodes.length - globalCount;
  const registeredEdges = graphData.edges.filter(e => e.status === 'registered').length;
  const pendingEdges = graphData.edges.length - registeredEdges;

  return (
    <TooltipProvider>
      <div className="tree-container">
        <ReactFlow
          nodes={nodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="rgba(255, 255, 255, 0.03)"
          />
          
          <Controls
            className="rf-controls"
            showInteractive={false}
          />

          <MiniMap
            className="rf-minimap"
            nodeColor={(node) => {
              const data = node.data as unknown as GraphNode;
              const status = STATUS_COLORS[data.status] || STATUS_COLORS.not_deployed;
              return status.color;
            }}
            maskColor="rgba(0, 0, 0, 0.8)"
            pannable
            zoomable
          />

          {/* 顶部统计面板 */}
          <Panel position="top-left" className="stats-panel">
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value" style={{ color: THEME.accent.primary }}>{globalCount}</span>
                <span className="stat-label">Global</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-value" style={{ color: THEME.accent.secondary }}>{projectCount}</span>
                <span className="stat-label">Project</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-value" style={{ color: THEME.accent.secondary }}>{registeredEdges}</span>
                <span className="stat-label">Linked</span>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <span className="stat-value" style={{ color: THEME.accent.warning }}>{pendingEdges}</span>
                <span className="stat-label">Pending</span>
              </div>
            </div>
          </Panel>

          {/* 底部图例 */}
          <Panel position="bottom-left" className="legend-panel">
            <div className="legend-grid">
              <div className="legend-section">
                <span className="legend-title">Status</span>
                <div className="legend-items">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: THEME.accent.secondary }} />
                    <span>{t('admin.contracts.status.ready')}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: THEME.accent.warning }} />
                    <span>{t('admin.contracts.status.notRegistered')}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: THEME.accent.muted }} />
                    <span>{t('admin.contracts.status.notDeployed')}</span>
                  </div>
                </div>
              </div>
              <div className="legend-section">
                <span className="legend-title">Dependency</span>
                <div className="legend-items">
                  <div className="legend-item">
                    <span className="legend-line solid" style={{ background: THEME.accent.secondary }} />
                    <span>{t('admin.contracts.status.registered')}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-line dashed" style={{ background: THEME.accent.warning }} />
                    <span>{t('admin.contracts.status.notRegistered')}</span>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </ReactFlow>

        <style>{containerStyles}</style>
        <style>{panelStyles}</style>
      </div>
    </TooltipProvider>
  );
}

// ============================================
// 样式
// ============================================
const containerStyles = `
  .tree-container {
    height: 700px;
    border-radius: 16px;
    overflow: hidden;
    background: ${THEME.bg.canvas};
    border: 1px solid ${THEME.border.subtle};
    position: relative;
  }
  .tree-loading, .tree-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;
  }
  .rf-controls {
    background: ${THEME.bg.glass} !important;
    border: 1px solid ${THEME.border.normal} !important;
    border-radius: 10px !important;
    backdrop-filter: blur(12px);
  }
  .rf-controls button {
    background: transparent !important;
    border: none !important;
    border-bottom: 1px solid ${THEME.border.subtle} !important;
    color: ${THEME.text.secondary} !important;
    width: 28px !important;
    height: 28px !important;
  }
  .rf-controls button:last-child {
    border-bottom: none !important;
  }
  .rf-controls button:hover {
    background: rgba(255, 255, 255, 0.05) !important;
    color: ${THEME.text.primary} !important;
  }
  .rf-controls button svg {
    fill: currentColor !important;
  }
  .rf-minimap {
    background: ${THEME.bg.glass} !important;
    border: 1px solid ${THEME.border.normal} !important;
    border-radius: 10px !important;
    backdrop-filter: blur(12px);
  }
  .react-flow__edge-path {
    stroke-linecap: round;
  }
  .react-flow__edge.animated path {
    animation: dashdraw 0.6s linear infinite;
  }
  @keyframes dashdraw {
    from { stroke-dashoffset: 20; }
    to { stroke-dashoffset: 0; }
  }
`;

const panelStyles = `
  .stats-panel {
    background: ${THEME.bg.glass};
    border: 1px solid ${THEME.border.normal};
    border-radius: 12px;
    padding: 12px 20px;
    backdrop-filter: blur(12px);
  }
  .stats-grid {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .stat-value {
    font-size: 20px;
    font-weight: 700;
    line-height: 1;
  }
  .stat-label {
    font-size: 10px;
    font-weight: 500;
    color: ${THEME.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .stat-divider {
    width: 1px;
    height: 32px;
    background: ${THEME.border.subtle};
  }
  .legend-panel {
    background: ${THEME.bg.glass};
    border: 1px solid ${THEME.border.normal};
    border-radius: 12px;
    padding: 14px 18px;
    backdrop-filter: blur(12px);
  }
  .legend-grid {
    display: flex;
    gap: 28px;
  }
  .legend-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .legend-title {
    font-size: 10px;
    font-weight: 600;
    color: ${THEME.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: ${THEME.text.secondary};
  }
  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .legend-line {
    width: 20px;
    height: 3px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .legend-line.dashed {
    background: repeating-linear-gradient(
      90deg,
      currentColor 0px,
      currentColor 4px,
      transparent 4px,
      transparent 7px
    ) !important;
  }
`;

export default ContractDependencyTree;
