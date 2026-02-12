/**
 * Contract Dependency Graph Component - Web3 Style
 * 合约依赖关系图可视化组件 - Web3 风格
 *
 * 特性：
 * - 项目分组展示
 * - 层次化依赖树
 * - 清晰的绑定状态
 * - 可折叠的项目组
 * - Web3 玻璃态设计
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Position,
  type NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Copy, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { contractGraphService, GraphNode } from '@/services/contract-graph';

// Web3 配色方案
const WEB3_COLORS = {
  // 节点类型颜色
  core: {
    primary: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.6)',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
  },
  project: {
    primary: '#00F0FF',
    glow: 'rgba(0, 240, 255, 0.5)',
    gradient: 'linear-gradient(135deg, #00F0FF 0%, #0080FF 100%)',
  },
  common: {
    primary: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.5)',
    gradient: 'linear-gradient(135deg, #A855F7 0%, #6366F1 100%)',
  },
  mock: {
    primary: '#FB923C',
    glow: 'rgba(251, 146, 60, 0.5)',
    gradient: 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)',
  },
  unknown: {
    primary: '#6B7280',
    glow: 'rgba(107, 114, 128, 0.3)',
    gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
  },
  // 状态颜色（纯 Provider 模式）
  status: {
    ready: '#10B981',           // 就绪
    not_deployed: '#6B7280',    // 未部署
    not_registered: '#F59E0B',  // 未注册
    missing_deps: '#EF4444',    // 缺少依赖
  },
  // 背景渐变
  background: {
    dark: 'radial-gradient(ellipse at top, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
    node: 'rgba(15, 15, 26, 0.8)',
    nodeBorder: 'rgba(255, 255, 255, 0.1)',
  },
};

// 可复制地址组件
function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[8px] font-mono text-white/50 hover:text-white/70 transition-colors"
      title={copied ? '已复制' : '复制地址'}
    >
      <span>{address.slice(0, 8)}...{address.slice(-6)}</span>
      {copied ? (
        <Check className="w-2.5 h-2.5 text-emerald-500" />
      ) : (
        <Copy className="w-2.5 h-2.5" />
      )}
    </button>
  );
}

// 自定义节点组件 - Web3 玻璃态风格（层次化布局优化）
function Web3ContractNode({ data }: { data: GraphNode }) {
  const [isHovered, setIsHovered] = useState(false);

  // 根据项目类型获取配色
  const getNodeStyle = () => {
    const typeStyle = data.project === 'vanke' ? WEB3_COLORS.project :
                       data.project === 'common' ? WEB3_COLORS.common :
                       data.project === 'mock' ? WEB3_COLORS.mock :
                       WEB3_COLORS.unknown;

    const statusStyle = data.status === 'missing_deps' ? {
      borderColor: WEB3_COLORS.status.missing_deps,
      glowColor: 'rgba(239, 68, 68, 0.8)',
      animation: 'pulse-red 2s ease-in-out infinite',
    } : data.status === 'not_registered' ? {
      borderColor: WEB3_COLORS.status.not_registered,
      glowColor: 'rgba(245, 158, 11, 0.6)',
      animation: 'pulse-orange 2s ease-in-out infinite',
    } : data.status === 'ready' ? {
      borderColor: WEB3_COLORS.status.ready,
      glowColor: 'rgba(16, 185, 129, 0.6)',
      animation: 'pulse-green 3s ease-in-out infinite',
    } : {
      borderColor: WEB3_COLORS.status.not_deployed,
      glowColor: 'transparent',
      animation: 'none',
    };

    return {
      ...typeStyle,
      ...statusStyle,
    };
  };

  const nodeStyle = getNodeStyle();

  // 节点尺寸
  const nodeWidth = 180;
  const nodeHeight = 100;

  return (
    <div
      style={{
        position: 'relative',
        width: nodeWidth,
        height: nodeHeight,
        padding: 12,
        borderRadius: 12,
        background: WEB3_COLORS.background.node,
        backdropFilter: 'blur(12px)',
        border: `2px solid ${nodeStyle.borderColor}`,
        boxShadow: isHovered
          ? `0 0 30px ${nodeStyle.glowColor}, 0 0 60px ${nodeStyle.glowColor}, inset 0 0 20px ${nodeStyle.glowColor}40`
          : `0 0 15px ${nodeStyle.glowColor}40, inset 0 0 10px ${nodeStyle.glowColor}20`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        animation: nodeStyle.animation,
        userSelect: 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 内部发光效果 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${nodeStyle.glowColor}15 0%, transparent 50%)`,
          pointerEvents: 'none',
        }}
      />

      {/* 内容 */}
      <div className="flex flex-col gap-1.5 w-full relative z-10">
        {/* 项目标签 */}
        <div className="flex justify-between items-center">
          <Badge
            className="text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold border-none text-white"
            style={{
              background: nodeStyle.gradient,
              boxShadow: `0 2px 6px ${nodeStyle.glowColor}40`,
            }}
          >
            {data.project || 'unknown'}
          </Badge>

          {/* 状态指示器 */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: data.status === 'ready' ? '#10B981' :
                         data.status === 'missing_deps' ? '#EF4444' :
                         data.status === 'not_registered' ? '#F59E0B' : '#6B7280',
              boxShadow: `0 0 8px ${data.status === 'ready' ? '#10B981' :
                                  data.status === 'missing_deps' ? '#EF4444' :
                                  data.status === 'not_registered' ? '#F59E0B' : '#6B7280'}`,
              animation: data.status === 'ready' ? 'status-pulse 2s ease-in-out infinite' :
                         data.status === 'missing_deps' ? 'status-alert 1s ease-in-out infinite' : 'none',
            }}
          />
        </div>

        {/* 合约名称 */}
        <span
          className="text-xs font-bold text-white block overflow-hidden text-ellipsis whitespace-nowrap"
          style={{
            textShadow: '0 0 8px rgba(255, 255, 255, 0.4)',
            letterSpacing: '0.3px',
            lineHeight: '1.3',
          }}
        >
          {data.label}
        </span>

        {/* 地址缩写 */}
        {data.address && (
          <CopyableAddress address={data.address} />
        )}

        {/* 状态文本 */}
        <span className="text-[9px] text-white/60">
          {data.status === 'ready' ? '已就绪' : 
           data.status === 'missing_deps' ? '缺少依赖' :
           data.status === 'not_registered' ? '未注册' : '未部署'}
        </span>
      </div>

      {/* 装饰性光晕 */}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '120%',
            height: '120%',
            background: `radial-gradient(circle, ${nodeStyle.glowColor}30 0%, transparent 70%)`,
            borderRadius: '50%',
            animation: 'glow-pulse 1s ease-out',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  contract: Web3ContractNode,
};

interface ContractDependencyGraphProps {
  onNodeClick?: (node: Node) => void;
}

export function ContractDependencyGraph({ onNodeClick }: ContractDependencyGraphProps) {
  const { data: graphData, isLoading, error } = useQuery({
    queryKey: ['contract-dependency-graph'],
    queryFn: contractGraphService.getDependencyGraph,
  });

  // 构建层次化依赖树布局
  const initialNodes: Node[] = useMemo(() => {
    if (!graphData) return [];

    const nodes: Node[] = [];
    const nodeWidth = 200;
    const nodeHeight = 100;
    const horizontalSpacing = 300; // 水平间距
    const verticalSpacing = 180; // 垂直间距
    const projectSpacing = 400; // 项目组之间的间距

    // 按项目分组
    const projectGroups: Record<string, GraphNode[]> = {};
    graphData.nodes.forEach((node) => {
      const project = node.project || 'unknown';
      if (!projectGroups[project]) {
        projectGroups[project] = [];
      }
      projectGroups[project].push(node);
    });

    // 构建依赖关系图
    const dependencies = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();

    graphData.edges.forEach((edge) => {
      if (!dependencies.has(edge.source)) {
        dependencies.set(edge.source, []);
      }
      dependencies.get(edge.source)!.push(edge.target);

      if (!dependents.has(edge.target)) {
        dependents.set(edge.target, []);
      }
      dependents.get(edge.target)!.push(edge.source);
    });

    // 计算每个节点的层级（深度优先）
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    const calculateLevel = (nodeId: string, currentLevel: number): number => {
      if (visited.has(nodeId)) {
        return levels.get(nodeId) || 0;
      }
      visited.add(nodeId);

      const deps = dependencies.get(nodeId) || [];
      if (deps.length === 0) {
        levels.set(nodeId, currentLevel);
        return currentLevel;
      }

      let maxChildLevel = currentLevel;
      deps.forEach((depId) => {
        maxChildLevel = Math.max(maxChildLevel, calculateLevel(depId, currentLevel + 1));
      });

      levels.set(nodeId, maxChildLevel);
      return maxChildLevel;
    };

    // 从没有依赖者的节点开始（顶层节点）
    const allNodes = new Set(graphData.nodes.map(n => n.id));
    const hasDependents = new Set(dependents.keys());
    const rootNodes = [...allNodes].filter(id => !hasDependents.has(id));

    rootNodes.forEach(nodeId => {
      calculateLevel(nodeId, 0);
    });

    // 按项目排列，然后按层级排列
    const projectNames = Object.keys(projectGroups).sort();
    let xOffset = 100;

    projectNames.forEach((project, projectIndex) => {
      const projectNodes = projectGroups[project];

      // 按层级和依赖关系排序
      const sortedNodes = [...projectNodes].sort((a, b) => {
        const levelA = levels.get(a.id) || 0;
        const levelB = levels.get(b.id) || 0;
        return levelB - levelA; // 高层级（依赖更多）在上面
      });

      // 按层级分组
      const levelGroups: Record<number, GraphNode[]> = {};
      sortedNodes.forEach((node) => {
        const level = levels.get(node.id) || 0;
        if (!levelGroups[level]) {
          levelGroups[level] = [];
        }
        levelGroups[level].push(node);
      });

      // 计算项目内节点位置
      const maxLevel = Math.max(...Object.keys(levelGroups).map(Number));
      const projectStartX = xOffset;

      Object.entries(levelGroups).forEach(([levelStr, levelNodes]) => {
        const level = parseInt(levelStr);
        const yPos = 150 + level * verticalSpacing;

        // 计算该层级的宽度
        const levelWidth = levelNodes.length * horizontalSpacing;
        const levelStartX = projectStartX + (Math.max(projectNodes.length * horizontalSpacing, levelWidth) - levelWidth) / 2;

        levelNodes.forEach((nodeData, index) => {
          const x = levelStartX + index * horizontalSpacing;
          const y = yPos;

          nodes.push({
            id: nodeData.id,
            type: 'contract',
            position: { x, y },
            data: nodeData,
            sourcePosition: Position.Bottom,
            targetPosition: Position.Top,
          });
        });
      });

      // 更新下一个项目的位置
      const maxNodesInLevel = Math.max(...Object.values(levelGroups).map(arr => arr.length));
      xOffset = projectStartX + maxNodesInLevel * horizontalSpacing + projectSpacing;
    });

    return nodes;
  }, [graphData]);

  // 边 - 清晰显示绑定状态
  const initialEdges: Edge[] = useMemo(() => {
    if (!graphData) return [];

    return graphData.edges.map((edge, index) => {
      const isRegistered = edge.status === 'registered';

      // 确定边的样式
      let strokeColor = '#6B7280'; // 默认灰色
      let strokeDasharray: string | undefined = undefined;
      let strokeWidth = 2;
      let animated = false;

      if (isRegistered) {
        strokeColor = '#10B981'; // 绿色 - 已注册
        strokeWidth = 2;
      } else {
        strokeColor = '#F59E0B'; // 橙色 - 未注册
        strokeDasharray = '5,5'; // 虚线
        animated = true;
      }

      // 标签文本
      const labelText = isRegistered ? '已注册' : '未注册';
      const labelColor = isRegistered ? '#10B981' : '#F59E0B';

      return {
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        label: (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-medium" style={{ color: labelColor }}>
              {edge.key || edge.target}
            </span>
            <Badge
              className="text-[8px] px-1 py-0 rounded"
              style={{
                background: isRegistered ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                border: `1px solid ${labelColor}`,
                color: labelColor,
              }}
            >
              {labelText}
            </Badge>
          </div>
        ),
        labelStyle: {
          fontSize: 9,
          fill: labelColor,
          fontWeight: 500,
        },
        labelShowBg: true,
        labelBgStyle: {
          fill: 'rgba(15, 15, 26, 0.95)',
          fillOpacity: 1,
          stroke: labelColor,
          strokeWidth: 1,
        },
        style: {
          stroke: strokeColor,
          strokeWidth,
          strokeOpacity: isRegistered ? 0.6 : 1,
          strokeDasharray,
        },
        animated,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 20,
          height: 20,
        },
      };
    });
  }, [graphData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 同步更新
  useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes]);

  useEffect(() => {
    if (initialEdges.length > 0) {
      setEdges(initialEdges);
    }
  }, [initialEdges, setEdges]);

  // 节点点击处理 - 添加高亮效果
  const onNodeClickHandler = useCallback((event: React.MouseEvent, node: Node) => {
    const connectedNodeIds = new Set<string>([node.id]);

    edges.forEach((edge) => {
      if (edge.source === node.id) {
        connectedNodeIds.add(edge.target);
      }
      if (edge.target === node.id) {
        connectedNodeIds.add(edge.source);
      }
    });

    const updatedNodes = nodes.map((n) => {
      const isConnected = connectedNodeIds.has(n.id);
      return {
        ...n,
        style: {
          ...n.style,
          opacity: isConnected ? 1 : 0.2,
          transform: isConnected ? 'scale(1.05)' : 'scale(0.95)',
        },
      };
    });

    setNodes(updatedNodes);
    onNodeClick?.(node);
  }, [nodes, edges, setNodes, onNodeClick]);

  if (isLoading) {
    return (
      <div 
        className="w-full flex items-center justify-center rounded-2xl"
        style={{
          height: 'calc(100vh - 280px)',
          minHeight: 600,
          background: WEB3_COLORS.background.dark,
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
          <Skeleton className="h-4 w-56 bg-white/10" />
          <Skeleton className="h-4 w-60 bg-white/10" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="w-full flex items-center justify-center rounded-2xl"
        style={{
          height: 'calc(100vh - 280px)',
          minHeight: 600,
          background: WEB3_COLORS.background.dark,
        }}
      >
        <Alert variant="destructive" className="max-w-md bg-red-500/10 border-red-500/30">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>加载失败</AlertTitle>
          <AlertDescription>
            {(error as Error).message || '无法加载合约依赖关系图数据'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div 
        className="w-full flex items-center justify-center rounded-2xl"
        style={{
          height: 'calc(100vh - 280px)',
          minHeight: 600,
          background: WEB3_COLORS.background.dark,
        }}
      >
        <span className="text-white/50">暂无合约数据</span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.6); }
          50% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.9); }
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.8); }
          50% { box-shadow: 0 0 30px rgba(239, 68, 68, 1); }
        }
        @keyframes status-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
        @keyframes status-alert {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
        @keyframes glow-pulse {
          0% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
        }
      `}</style>

      {/* 图例 */}
      <div className="mb-4 p-3 rounded-xl border border-white/10 backdrop-blur-lg" style={{ background: 'rgba(15, 15, 26, 0.6)' }}>
        <div className="flex flex-wrap items-center gap-6">
          <span className="text-white/70 text-xs">
            <strong>连线说明：</strong>
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-[30px] h-0.5 bg-emerald-500 rounded-sm" />
              <span className="text-white/60 text-[11px]">已绑定</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div 
                className="w-[30px] h-0.5 rounded-sm"
                style={{ background: 'repeating-linear-gradient(90deg, #F59E0B 0, #F59E0B 4px, transparent 4px, transparent 8px)' }}
              />
              <span className="text-white/60 text-[11px]">已部署未绑定</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div 
                className="w-[30px] h-0.5 bg-red-500 rounded-sm"
                style={{ animation: 'status-pulse 1s ease-in-out infinite' }}
              />
              <span className="text-white/60 text-[11px]">需要更新</span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="w-full rounded-2xl overflow-hidden border border-white/10"
        style={{
          height: 'calc(100vh - 380px)',
          minHeight: 600,
          background: WEB3_COLORS.background.dark,
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(0, 240, 255, 0.05)',
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClickHandler}
          nodeTypes={nodeTypes}
          fitView
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
          }}
          proOptions={{
            hideAttribution: true,
          }}
        >
          {/* Web3 风格背景 */}
          <Background
            color="rgba(0, 240, 255, 0.08)"
            gap={16}
            style={{ opacity: 0.5 }}
          />
          <Controls
            style={{
              background: 'rgba(15, 15, 26, 0.9)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: 8,
              fill: '#00F0FF',
            }}
          />
          <MiniMap
            style={{
              background: 'rgba(15, 15, 26, 0.9)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: 8,
              stroke: '#00F0FF',
            }}
            nodeColor="#00F0FF"
            nodeStrokeWidth={2}
            maskColor="rgba(0, 0, 0, 0.5)"
          />
        </ReactFlow>
      </div>
    </>
  );
}

export default ContractDependencyGraph;
