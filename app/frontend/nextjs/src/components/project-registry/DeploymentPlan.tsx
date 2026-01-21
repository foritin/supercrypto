/**
 * 部署计划组件
 *
 * Story 10.7: 前端项目状态仪表盘
 * 
 * 已迁移至 shadcn/ui 组件
 */

'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';
import type { DeploymentOrderResponse } from '@/types/project-registry';

interface DeploymentPlanProps {
  plan: DeploymentOrderResponse;
}

export function DeploymentPlan({ plan }: DeploymentPlanProps) {
  const progress = plan.total_steps > 0
    ? Math.round((plan.deployed_count / plan.total_steps) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">部署计划</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 进度条 */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              已部署: <span className="font-semibold text-foreground">{plan.deployed_count}</span>
            </span>
            <span className="text-muted-foreground">
              待部署: <span className="font-semibold text-foreground">{plan.pending_count}</span>
            </span>
          </div>
        </div>

        {/* 分阶段展示 */}
        <div className="flex flex-col gap-4">
          {Object.entries(plan.phases)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([phase, steps]) => (
              <div key={phase}>
                <span className="text-xs text-muted-foreground mb-2 block">
                  阶段 {phase}
                </span>

                <div className="flex flex-wrap items-center gap-1">
                  {steps.map((step, idx) => (
                    <div key={step.name} className="flex items-center gap-1">
                      {step.is_deployed ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <code
                        className={`text-xs px-1.5 py-0.5 rounded bg-muted/50 ${
                          step.is_deployed ? 'text-green-500' : 'text-muted-foreground'
                        }`}
                      >
                        {step.name}
                      </code>
                      {idx < steps.length - 1 && (
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground mx-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>

        {/* 下一步建议 */}
        {plan.next_deployable.length > 0 && (
          <div className="mt-4 p-3 bg-green-500/10 rounded-md border border-green-500/30">
            <span className="font-semibold text-green-500 block mb-2">
              推荐下一步部署:
            </span>
            <div className="flex flex-wrap gap-2">
              {plan.next_deployable.map((name) => (
                <Badge 
                  key={name} 
                  className="bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30"
                >
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 全部部署完成 */}
        {plan.pending_count === 0 && plan.total_steps > 0 && (
          <div className="mt-4 p-4 bg-green-500/10 rounded-md border border-green-500/30 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
            <h5 className="text-green-500 font-semibold mt-2">
              所有合约已部署完成！
            </h5>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
