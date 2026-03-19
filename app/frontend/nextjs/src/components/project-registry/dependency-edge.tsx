/**
 * 自定义依赖边组件
 *
 * Story 10.8: 依赖图可视化
 */

'use client';

import {
  type Edge,
  type EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  BaseEdge,
} from '@xyflow/react';
import { memo } from 'react';


interface DependencyEdgeData {
  label?: string;
}

type DependencyFlowEdge = Edge<Record<string, unknown>, 'dependency'>;

function DependencyEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<DependencyFlowEdge>) {
  const edgeData = data as DependencyEdgeData | undefined;
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        {...(markerEnd ? { markerEnd } : {})}
        style={style}
      />

      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              padding: '2px 6px',
              background: 'white',
              borderRadius: 4,
              fontSize: 10,
              color: '#6b7280',
              border: '1px solid #e5e7eb',
            }}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DependencyEdge = memo(DependencyEdgeComponent);
