/**
 * 依赖图主组件
 *
 * Story 10.8: 依赖图可视化
 */

'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  type Node,
  type Edge,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';
import { ContractNode } from './contract-node';
import { DependencyEdge } from './dependency-edge';
import { useDependencyGraph } from '@/hooks/use-project-status';
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


export function DependencyGraph({ projectName, network = 'hardhat' }: DependencyGraphProps) {
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
  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
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
      <div className="h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">加载依赖图...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted/30 rounded-lg">
        <span className="text-sm text-destructive">加载失败</span>
      </div>
    );
  }

  return (
    <div className="h-[500px] border border-border rounded-lg overflow-hidden">
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
          <Card className="p-3 text-xs w-40">
            <div className="font-medium mb-2">图例</div>

            <div className="flex flex-col gap-1 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span>已激活</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span>已绑定</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <span>已部署</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                <span>未部署</span>
              </div>
            </div>

            <div className="border-t border-border pt-2 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-500" />
                <span>必须 (已绑定)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500" />
                <span>必须 (未绑定)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-gray-400 border-t-2 border-dashed border-gray-400" />
                <span>可选依赖</span>
              </div>
            </div>

            {selectedNode && (
              <Button
                size="sm"
                variant="outline"
                onClick={resetHighlight}
                className="w-full mt-2"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                清除高亮
              </Button>
            )}
          </Card>
        </Panel>
      </ReactFlow>
    </div>
  );
}
