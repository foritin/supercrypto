/**
 * 部署计划组件
 *
 * Story 10.7: 前端项目状态仪表盘
 */

'use client';

import { Card, Progress, Tag, Typography, Space } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import type { DeploymentOrderResponse } from '@/types/project-registry';

const { Text, Title } = Typography;

interface DeploymentPlanProps {
  plan: DeploymentOrderResponse;
}

export function DeploymentPlan({ plan }: DeploymentPlanProps) {
  const progress = plan.total_steps > 0
    ? Math.round((plan.deployed_count / plan.total_steps) * 100)
    : 0;

  return (
    <Card title="部署计划" size="small">
      {/* 进度条 */}
      <div style={{ marginBottom: 16 }}>
        <Progress percent={progress} size="small" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <Text type="secondary">已部署: <Text strong>{plan.deployed_count}</Text></Text>
          <Text type="secondary">待部署: <Text strong>{plan.pending_count}</Text></Text>
        </div>
      </div>

      {/* 分阶段展示 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Object.entries(plan.phases)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([phase, steps]) => (
            <div key={phase}>
              <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                阶段 {phase}
              </Text>

              <Space wrap size={4}>
                {steps.map((step, idx) => (
                  <Space key={step.name} size={2}>
                    {step.is_deployed ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <ClockCircleOutlined style={{ color: '#d9d9d9' }} />
                    )}
                    <Text
                      code
                      style={{
                        color: step.is_deployed ? '#52c41a' : '#8c8c8c',
                        fontSize: 12,
                      }}
                    >
                      {step.name}
                    </Text>
                    {idx < steps.length - 1 && (
                      <ArrowRightOutlined style={{ color: '#d9d9d9', fontSize: 10 }} />
                    )}
                  </Space>
                ))}
              </Space>
            </div>
          ))}
      </div>

      {/* 下一步建议 */}
      {plan.next_deployable.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: '#f6ffed',
            borderRadius: 6,
            border: '1px solid #b7eb8f',
          }}
        >
          <Text strong style={{ color: '#52c41a', display: 'block', marginBottom: 8 }}>
            推荐下一步部署:
          </Text>
          <Space wrap>
            {plan.next_deployable.map((name) => (
              <Tag key={name} color="success">{name}</Tag>
            ))}
          </Space>
        </div>
      )}

      {/* 全部部署完成 */}
      {plan.pending_count === 0 && plan.total_steps > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: '#f6ffed',
            borderRadius: 6,
            border: '1px solid #b7eb8f',
            textAlign: 'center',
          }}
        >
          <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />
          <Title level={5} style={{ color: '#52c41a', margin: '8px 0 0' }}>
            所有合约已部署完成！
          </Title>
        </div>
      )}
    </Card>
  );
}
