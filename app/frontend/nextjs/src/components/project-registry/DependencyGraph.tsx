/**
 * 依赖图主组件
 *
 * Story 10.8: 依赖图可视化
 */

'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeMouseHandler,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';

import { ContractNode } from './ContractNode';
import { DependencyEdge } from './DependencyEdge';
import { useDependencyGraph } from '@/hooks/useProjectStatus';
import type { DependencyType } from '@/types/project-registry';


// 自定义节点类型
const nodeTypes = {
  contract: ContractNode,
};

// 自定义边类型
const edgeTypes = {
  dependency: DependencyEdge,
};


interface DependencyGraphProps {
  projectName: string;
  network?: string;
}


export function DependencyGraph({ projectName, network = 'local' }: DependencyGraphProps) {
  const { data, error, isLoading } = useDependencyGraph(projectName, network);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedEdges, setHighlightedEdges] = useState<Set<string>>(new Set());

  // 转换节点数据
  const initialNodes: Node[] = useMemo(() => {
    if (!data) return [];
    return data.nodes.map((node) => ({
      id: node.id,
      type: 'contract',
      position: node.position,
      data: node.data,
      selected: node.id === selectedNode,
    }));
  }, [data, selectedNode]);

  // 转换边数据（带高亮逻辑）
  const initialEdges: Edge[] = useMemo(() => {
    if (!data) return [];
    return data.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'dependency',
      animated: edge.animated,
      style: {
        ...edge.style,
        opacity: highlightedEdges.size === 0 || highlightedEdges.has(edge.id) ? 1 : 0.15,
      },
      data: { label: edge.label },
    }));
  }, [data, highlightedEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 同步节点和边数据
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // 点击节点 - 高亮依赖链
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    if (selectedNode === node.id) {
      // 取消选中
      setSelectedNode(null);
      setHighlightedNodes(new Set());
      setHighlightedEdges(new Set());
      return;
    }

    setSelectedNode(node.id);

    // 找出所有相关节点和边
    const relatedNodes = new Set<string>([node.id]);
    const relatedEdges = new Set<string>();

    // 向上查找依赖（该节点依赖谁）
    const findUpstream = (nodeId: string, visited: Set<string> = new Set()) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      data?.edges.forEach((edge) => {
        if (edge.target === nodeId) {
          relatedNodes.add(edge.source);
          relatedEdges.add(edge.id);
          findUpstream(edge.source, visited);
        }
      });
    };

    // 向下查找被依赖（谁依赖该节点）
    const findDownstream = (nodeId: string, visited: Set<string> = new Set()) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      data?.edges.forEach((edge) => {
        if (edge.source === nodeId) {
          relatedNodes.add(edge.target);
          relatedEdges.add(edge.id);
          findDownstream(edge.target, visited);
        }
      });
    };

    findUpstream(node.id);
    findDownstream(node.id);

    setHighlightedNodes(relatedNodes);
    setHighlightedEdges(relatedEdges);
  }, [data, selectedNode]);

  // 重置高亮
  const resetHighlight = useCallback(() => {
    setSelectedNode(null);
    setHighlightedNodes(new Set());
    setHighlightedEdges(new Set());
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          height: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          borderRadius: 8,
        }}
      >
        <Spin />
        <Text type="secondary" style={{ marginLeft: 8 }}>加载依赖图...</Text>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          height: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fafafa',
          borderRadius: 8,
        }}
      >
        <Text type="danger">加载失败</Text>
      </div>
    );
  }

  return (
    <div style={{ height: 500, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        {/* 背景网格 */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e5e7eb"
        />

        {/* 控制栏 */}
        <Controls />

        {/* 小地图 */}
        <MiniMap
          nodeStrokeColor={(n) => {
            const type = n.data?.dependency_type as DependencyType;
            const colors: Record<DependencyType, string> = {
              primary: '#eab308',
              required: '#ef4444',
              business: '#3b82f6',
              optional: '#9ca3af',
            };
            return colors[type] || '#9ca3af';
          }}
          nodeColor={(n) => {
            if (highlightedNodes.size > 0 && !highlightedNodes.has(n.id)) {
              return '#e5e7eb';
            }
            return '#ffffff';
          }}
          maskColor="rgba(0,0,0,0.08)"
          style={{ background: '#fafafa' }}
        />

        {/* 图例面板 */}
        <Panel position="top-right">
          <Card size="small" style={{ fontSize: 12, width: 160 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>图例</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                <span>已激活</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }} />
                <span>已绑定</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a855f7' }} />
                <span>已部署</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9ca3af' }} />
                <span>未部署</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 2, background: '#22c55e' }} />
                <span>必须 (已绑定)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 2, background: '#ef4444' }} />
                <span>必须 (未绑定)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 16, height: 2, background: '#9ca3af', borderTop: '2px dashed' }} />
                <span>可选依赖</span>
              </div>
            </div>

            {selectedNode && (
              <Button
                size="small"
                icon={<ClearOutlined />}
                onClick={resetHighlight}
                style={{ width: '100%', marginTop: 8 }}
              >
                清除高亮
              </Button>
            )}
          </Card>
        </Panel>
      </ReactFlow>
    </div>
  );
}
