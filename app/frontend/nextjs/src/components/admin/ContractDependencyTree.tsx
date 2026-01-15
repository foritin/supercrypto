/**
 * Contract Dependency Tree Component - Web3 Style
 * 合约依赖关系树组件 - Web3 风格
 *
 * 数据结构理解：
 * - module: 合约模块类型（kyc, stablecoin, business, oracle）
 * - project: 项目归属（如 vanke, common）
 *
 * 树形结构：
 * 📁 公共组件
 *   ├─ KYC (kyc)
 *   ├─ USDT (stablecoin)
 *   └─ USDC (stablecoin)
 * 📁 万科项目
 *   ├─ VankeRWAToken (business)
 *   ├─ VankePlatformToken (business)
 *   └─ MultiSigManager (oracle)
 */
'use client';

import { useMemo, useState } from 'react';
import { Tree, Tag, Space, Typography, Skeleton, Alert, Empty, Divider, Drawer } from 'antd';
import { FolderOutlined, FileOutlined, DownOutlined, CloseOutlined, CopyOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { contractGraphService, type DependencyGraphData, type GraphNode } from '@/services/contract-graph';

const { Text } = Typography;

// Web3 配色方案
const WEB3_COLORS = {
  // 项目颜色
  project: {
    vanke: '#00F0FF',
    common: '#A855F7',
    unknown: '#6B7280',
  },
  // 模块颜色
  module: {
    kyc: '#10B981',           // 绿色 - KYC
    stablecoin: '#F59E0B',    // 橙色 - 稳定币
    business: '#00F0FF',      // 青色 - 业务
    oracle: '#A855F7',        // 紫色 - 预言机
  },
  // 状态颜色
  status: {
    synced: '#10B981',
    needs_update: '#EF4444',
    not_deployed: '#6B7280',
  },
  // 绑定状态颜色
  binding: {
    binded: '#10B981',
    deployed_not_binded: '#F59E0B',
    not_deployed: '#6B7280',
    needs_update: '#EF4444',
  },
};

// 模块显示配置 - 将在组件中使用翻译
const MODULE_ICONS: Record<string, string> = {
  kyc: '🔐',
  stablecoin: '💰',
  business: '📄',
  oracle: '🔮',
};

// 树节点数据结构
interface TreeNode {
  key: string;
  title: React.ReactNode;
  children?: TreeNode[];
}

interface ContractDependencyTreeProps {
  onContractClick?: (contractId: string) => void;
}

export function ContractDependencyTree({ onContractClick }: ContractDependencyTreeProps) {
  const { t } = useTranslation();
  // 预览面板状态
  const [previewNode, setPreviewNode] = useState<GraphNode | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { data: graphData, isLoading, error } = useQuery({
    queryKey: ['contract-dependency-graph'],
    queryFn: contractGraphService.getDependencyGraph,
  });

  // 构建依赖关系映射（用于预览面板）- 必须在所有条件返回之前
  const dependenciesMap = useMemo(() => {
    if (!graphData) return new Map();
    const map = new Map<string, DependencyGraphData['edges']>();
    graphData.edges.forEach((edge) => {
      if (!map.has(edge.source)) {
        map.set(edge.source, []);
      }
      map.get(edge.source)!.push(edge);
    });
    return map;
  }, [graphData]);

  // 构建树形数据结构
  const treeData = useMemo((): TreeNode[] => {
    if (!graphData || graphData.nodes.length === 0) return [];

    // 构建依赖关系映射
    const dependencies = new Map<string, DependencyGraphData['edges']>();
    graphData.edges.forEach((edge) => {
      if (!dependencies.has(edge.source)) {
        dependencies.set(edge.source, []);
      }
      dependencies.get(edge.source)!.push(edge);
    });

    // 分组策略：
    // 1. 公共组件：kyc + stablecoin 模块，project 为 'common' 或 null
    // 2. 具体项目：business + oracle 模块，按 project 分组（如 vanke）

    const commonNodes: GraphNode[] = [];
    const projectGroups: Record<string, GraphNode[]> = {};

    graphData.nodes.forEach((node) => {
      const isCommonModule = node.module === 'kyc' || node.module === 'stablecoin';
      const isCommonProject = !node.project || node.project === 'common' || node.project === 'unknown';

      if (isCommonModule && isCommonProject) {
        // 公共组件
        commonNodes.push(node);
      } else {
        // 项目合约
        const project = node.project || 'unknown';
        if (!projectGroups[project]) {
          projectGroups[project] = [];
        }
        projectGroups[project].push(node);
      }
    });

    const treeNodes: TreeNode[] = [];

    // 1. 公共组件组
    if (commonNodes.length > 0) {
      treeNodes.push({
        key: 'group-common',
        title: (
          <Space size={10}>
            <FolderOutlined style={{ color: WEB3_COLORS.project.common, fontSize: 16 }} />
            <Text strong style={{ color: '#fff', fontSize: 16 }}>
              {t('admin.contracts.filters.common')}
            </Text>
            <Tag
              style={{
                margin: 0,
                background: `${WEB3_COLORS.project.common}20`,
                border: `1px solid ${WEB3_COLORS.project.common}40`,
                color: WEB3_COLORS.project.common,
                borderRadius: 4,
                fontSize: 12,
                padding: '2px 8px',
              }}
            >
              {commonNodes.length}
            </Tag>
          </Space>
        ),
        children: commonNodes.map((node) => createContractNode(node, dependencies, onContractClick, t)),
      });
    }

    // 2. 各个项目组
    Object.entries(projectGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([project, nodes]) => {
        const projectColor = WEB3_COLORS.project[project as keyof typeof WEB3_COLORS.project] || WEB3_COLORS.project.unknown;
        const projectLabel = t(`admin.contracts.filters.${project}`) || project;

        treeNodes.push({
          key: `project-${project}`,
          title: (
            <Space size={10}>
              <FolderOutlined style={{ color: projectColor, fontSize: 16 }} />
              <Text strong style={{ color: '#fff', fontSize: 16 }}>
                {projectLabel}
              </Text>
              <Tag
                style={{
                  margin: 0,
                  background: `${projectColor}20`,
                  border: `1px solid ${projectColor}40`,
                  color: projectColor,
                  borderRadius: 4,
                  fontSize: 12,
                  padding: '2px 8px',
                }}
              >
                {nodes.length}
              </Tag>
            </Space>
          ),
          children: nodes.map((node) => createContractNode(node, dependencies, onContractClick, t)),
        });
      });

    return treeNodes;
  }, [graphData, onContractClick, setPreviewNode, setPreviewOpen, t]);

  // 创建合约节点
  function createContractNode(
    node: GraphNode,
    dependencies: Map<string, DependencyGraphData['edges']>,
    onContractClick?: (contractId: string) => void,
    t?: any,
  ): TreeNode {
    const nodeDeps = dependencies.get(node.id) || [];
    const statusColor = node.status === 'synced' ? WEB3_COLORS.status.synced :
                       node.status === 'needs_update' ? WEB3_COLORS.status.needs_update :
                       WEB3_COLORS.status.not_deployed;

    // 获取模块显示信息
    const moduleIcon = node.module ? MODULE_ICONS[node.module] : null;
    const moduleLabel = node.module ? t(`admin.contracts.tree.module.${node.module}`) : null;
    const moduleColor = node.module ? WEB3_COLORS.module[node.module] || '#6B7280' : '#6B7280';

    return {
      key: node.id,
      title: (
        <div
          onClick={(e) => {
            e.stopPropagation();
            // 打开预览面板
            setPreviewNode(node);
            setPreviewOpen(true);
            // 同时触发原有的点击事件
            onContractClick?.(node.id);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            transition: 'all 0.2s',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = `${statusColor}40`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          {/* 主信息行 */}
          <Space size={10} style={{ marginBottom: nodeDeps.length > 0 ? 10 : 0 }}>
            <FileOutlined style={{ color: statusColor, fontSize: 15 }} />
            <Text strong style={{ color: '#fff', fontSize: 15 }}>
              {node.label}
            </Text>
            {/* 模块标签 */}
            {moduleIcon && moduleLabel && (
              <Tag
                style={{
                  margin: 0,
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: `${moduleColor}15`,
                  border: `1px solid ${moduleColor}40`,
                  color: moduleColor,
                }}
              >
                {moduleIcon} {moduleLabel}
              </Tag>
            )}
            <Tag
              style={{
                margin: 0,
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 4,
                background: `${statusColor}20`,
                border: `1px solid ${statusColor}40`,
                color: statusColor,
              }}
            >
              {node.status === 'synced' ? t('admin.contracts.status.synced') : node.status === 'needs_update' ? t('admin.contracts.status.needs_update') : t('admin.contracts.status.not_deployed')}
            </Tag>
          </Space>

          {/* 地址 */}
          <div style={{ marginLeft: 24, marginBottom: nodeDeps.length > 0 ? 8 : 0 }}>
            <Text
              copyable={{
                text: node.address,
                tooltips: [t('common.copy'), t('common.copied')],
              }}
              style={{
                fontSize: 12,
                fontFamily: 'monospace',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              {node.address.slice(0, 10)}...{node.address.slice(-8)}
            </Text>
          </div>

          {/* 依赖关系列表 */}
          {nodeDeps.length > 0 && (
            <div style={{ marginLeft: 24, marginTop: 8 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.6)',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {t('admin.contracts.tree.dependencies')} ({nodeDeps.length}):
              </Text>
              <Space orientation="vertical" size={6}>
                {nodeDeps.map((dep, idx) => {
                  const bindingColor = dep.status === 'needs_update' ? WEB3_COLORS.binding.needs_update :
                                     dep.isBinded ? WEB3_COLORS.binding.binded :
                                     dep.isDeployed ? WEB3_COLORS.binding.deployed_not_binded :
                                     WEB3_COLORS.binding.not_deployed;

                  const bindingText = dep.status === 'needs_update' ? '需要更新' :
                                   dep.isBinded ? '已绑定' :
                                   dep.isDeployed ? '已部署未绑定' : '未部署';

                  const bindingIcon = dep.isBinded ? '✓' :
                                    dep.isDeployed ? '⚠' : '✗';

                  return (
                    <div
                      key={`${node.id}-dep-${idx}`}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderLeft: `2px solid ${bindingColor}`,
                      }}
                    >
                      <Space size={10}>
                        <span style={{ color: bindingColor, fontSize: 14 }}>
                          {bindingIcon}
                        </span>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 13 }}>
                          {dep.label}
                        </Text>
                        {dep.setFunction && (
                          <Tag
                            style={{
                              margin: 0,
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: `${bindingColor}15`,
                              border: `1px solid ${bindingColor}40`,
                              color: bindingColor,
                            }}
                          >
                            {dep.setFunction}()
                          </Tag>
                        )}
                        <Tag
                          style={{
                            margin: 0,
                            fontSize: 10,
                            padding: '0 4px',
                            borderRadius: 3,
                            background: `${bindingColor}20`,
                            border: `1px solid ${bindingColor}40`,
                            color: bindingColor,
                          }}
                        >
                          {bindingText}
                        </Tag>
                      </Space>
                    </div>
                  );
                })}
              </Space>
            </div>
          )}
        </div>
      ),
    };
  }

  if (isLoading) {
    return (
      <div style={{
        padding: 24,
        background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
        borderRadius: 16,
        minHeight: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 24,
        background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
        borderRadius: 16,
        minHeight: 400,
      }}>
        <Alert
          type="error"
          message="加载失败"
          description={(error as Error).message || '无法加载合约依赖关系数据'}
          showIcon
          style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none' }}
        />
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div style={{
        padding: 24,
        background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
        borderRadius: 16,
        minHeight: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Empty description="暂无合约数据" style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
      </div>
    );
  }

  return (
    <>
      <div style={{
        padding: 24,
        background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
        borderRadius: 16,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), inset 0 0 60px rgba(0, 240, 255, 0.05)',
      }}>
      {/* 图例 */}
      <div style={{
        marginBottom: 16,
        padding: 16,
        background: 'rgba(15, 15, 26, 0.6)',
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
      }}>
        <Space size="large" wrap>
          <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
            <strong>绑定状态：</strong>
          </Text>
          <Space size={16}>
            <Space size={6}>
              <span style={{ color: WEB3_COLORS.binding.binded, fontSize: 15 }}>✓</span>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13 }}>已绑定</Text>
            </Space>
            <Space size={6}>
              <span style={{ color: WEB3_COLORS.binding.deployed_not_binded, fontSize: 15 }}>⚠</span>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13 }}>已部署未绑定</Text>
            </Space>
            <Space size={6}>
              <span style={{ color: WEB3_COLORS.binding.needs_update, fontSize: 15 }}>✗</span>
              <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 13 }}>需要更新</Text>
            </Space>
          </Space>
          <Divider orientation="vertical" style={{ background: 'rgba(255, 255, 255, 0.2)', margin: '0 12px' }} />
          <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
            <strong>模块类型：</strong>
          </Text>
          <Space size={10}>
            <Tag style={{ margin: 0, fontSize: 12, padding: '4px 8px', borderRadius: 4,
              background: `${WEB3_COLORS.module.kyc}20`, border: `1px solid ${WEB3_COLORS.module.kyc}40`,
              color: WEB3_COLORS.module.kyc }}>
              🔐 KYC
            </Tag>
            <Tag style={{ margin: 0, fontSize: 12, padding: '4px 8px', borderRadius: 4,
              background: `${WEB3_COLORS.module.stablecoin}20`, border: `1px solid ${WEB3_COLORS.module.stablecoin}40`,
              color: WEB3_COLORS.module.stablecoin }}>
              💰 稳定币
            </Tag>
            <Tag style={{ margin: 0, fontSize: 12, padding: '4px 8px', borderRadius: 4,
              background: `${WEB3_COLORS.module.business}20`, border: `1px solid ${WEB3_COLORS.module.business}40`,
              color: WEB3_COLORS.module.business }}>
              📄 业务
            </Tag>
            <Tag style={{ margin: 0, fontSize: 12, padding: '4px 8px', borderRadius: 4,
              background: `${WEB3_COLORS.module.oracle}20`, border: `1px solid ${WEB3_COLORS.module.oracle}40`,
              color: WEB3_COLORS.module.oracle }}>
              🔮 预言机
            </Tag>
          </Space>
        </Space>
      </div>

      {/* 树形结构 */}
      <Tree
        showLine={{
          showLeafIcon: false,
        }}
        defaultExpandAll
        switcherIcon={<DownOutlined />}
        treeData={treeData}
        style={{
          background: 'transparent',
          fontSize: 14,
        }}
        className="web3-dependency-tree"
      />

      <style>{`
        .web3-dependency-tree .ant-tree-treenode {
          padding: 6px 0;
        }
        .web3-dependency-tree .ant-tree-switcher {
          color: rgba(255, 255, 255, 0.5);
        }
        .web3-dependency-tree .ant-tree-switcher:hover {
          color: #00F0FF;
        }
        .web3-dependency-tree .ant-tree-node-content-wrapper {
          color: rgba(255, 255, 255, 0.85);
          border-radius: 6px;
          transition: all 0.2s;
        }
        .web3-dependency-tree .ant-tree-node-content-wrapper:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }
        .web3-dependency-tree .ant-tree-line {
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </div>

      {/* 预览面板 */}
      <Drawer
        title={null}
        onClose={() => setPreviewOpen(false)}
        open={previewOpen}
        size={480}
        placement="right"
        styles={{
          body: { padding: 0 },
          content: {
            background: 'radial-gradient(ellipse at top, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
          },
        }}
        closable={false}
      >
        {previewNode && (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* 头部 */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}>
              <div style={{ flex: 1 }}>
                <Space orientation="vertical" size={10}>
                  <Space size={10}>
                    <Text strong style={{ color: '#fff', fontSize: 20 }}>
                      {previewNode.label}
                    </Text>
                    {previewNode.module && MODULE_ICONS[previewNode.module] && (
                      <Tag
                        style={{
                          margin: 0,
                          fontSize: 12,
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: `${WEB3_COLORS.module[previewNode.module]}15`,
                          border: `1px solid ${WEB3_COLORS.module[previewNode.module]}40`,
                          color: WEB3_COLORS.module[previewNode.module],
                        }}
                      >
                        {MODULE_ICONS[previewNode.module]} {t(`admin.contracts.tree.module.${previewNode.module}`)}
                      </Tag>
                    )}
                  </Space>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
                    {t(`admin.contracts.filters.${previewNode.project}`) || previewNode.project || t('admin.contracts.tree.ungrouped')}
                  </Text>
                </Space>
              </div>
              <div
                onClick={() => setPreviewOpen(false)}
                style={{
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <CloseOutlined style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              </div>
            </div>

            {/* 内容区域 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
              <Space orientation="vertical" size={28} style={{ width: '100%' }}>
                {/* 状态卡片 */}
                <div style={{
                  padding: 20,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                  <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
                      {t('admin.contracts.tree.contractStatus')}
                    </Text>
                    <Space size={14}>
                      {previewNode.status === 'synced' ? (
                        <CheckCircleOutlined style={{ color: WEB3_COLORS.status.synced, fontSize: 20 }} />
                      ) : (
                        <ExclamationCircleOutlined style={{ color: WEB3_COLORS.status.needs_update, fontSize: 20 }} />
                      )}
                      <Text style={{
                        color: previewNode.status === 'synced' ? WEB3_COLORS.status.synced : WEB3_COLORS.status.needs_update,
                        fontSize: 16,
                      }}>
                        {previewNode.status === 'synced' ? t('admin.contracts.preview.synced') : t('admin.contracts.status.needs_update')}
                      </Text>
                    </Space>
                  </Space>
                </div>

                {/* 合约地址 */}
                <div style={{
                  padding: 20,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                  <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
                      {t('admin.contracts.tree.contractAddress')}
                    </Text>
                    <Space size={10}>
                      <Text
                        copyable={{
                          text: previewNode.address,
                          tooltips: [t('admin.contracts.preview.copyAddress'), t('common.copied')],
                          icon: <CopyOutlined style={{ fontSize: 14 }} />,
                        }}
                        style={{
                          fontSize: 15,
                          fontFamily: 'monospace',
                          color: '#fff',
                          wordBreak: 'break-all',
                        }}
                      >
                        {previewNode.address}
                      </Text>
                    </Space>
                  </Space>
                </div>

                {/* 部署时间 */}
                {previewNode.deployedAt && (
                  <div style={{
                    padding: 20,
                    borderRadius: 14,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}>
                    <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                      <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
                        {t('admin.contracts.tree.deployedAt')}
                      </Text>
                      <Text style={{ color: '#fff', fontSize: 15 }}>
                        {new Date(previewNode.deployedAt).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Space>
                  </div>
                )}

                {/* 依赖关系 */}
                {(() => {
                  const nodeDeps = dependenciesMap.get(previewNode.id) || [];
                  if (nodeDeps.length === 0) return null;

                  return (
                    <div style={{
                      padding: 20,
                      borderRadius: 14,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}>
                      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 14 }}>
                          {t('admin.contracts.tree.dependencyRelations')} ({nodeDeps.length})
                        </Text>
                        <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                          {nodeDeps.map((dep, idx) => {
                            const bindingColor = dep.status === 'needs_update' ? WEB3_COLORS.binding.needs_update :
                                               dep.isBinded ? WEB3_COLORS.binding.binded :
                                               dep.isDeployed ? WEB3_COLORS.binding.deployed_not_binded :
                                               WEB3_COLORS.binding.not_deployed;

                            const bindingText = dep.status === 'needs_update' ? t('admin.contracts.status.needs_update') :
                                             dep.isBinded ? t('admin.contracts.tree.binded') :
                                             dep.isDeployed ? t('admin.contracts.tree.deployedNotBinded') : t('admin.contracts.status.not_deployed');

                            const bindingIcon = dep.isBinded ? '✓' :
                                              dep.isDeployed ? '⚠' : '✗';

                            return (
                              <div
                                key={`${previewNode.id}-dep-${idx}`}
                                style={{
                                  padding: 16,
                                  borderRadius: 10,
                                  background: 'rgba(0, 0, 0, 0.2)',
                                  borderLeft: `3px solid ${bindingColor}`,
                                }}
                              >
                                <Space orientation="vertical" size={10} style={{ width: '100%' }}>
                                  <Space size={10} wrap>
                                    <span style={{ color: bindingColor, fontSize: 16 }}>
                                      {bindingIcon}
                                    </span>
                                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: 500 }}>
                                      {dep.label}
                                    </Text>
                                  </Space>
                                  <Space size={10} wrap>
                                    {dep.setFunction && (
                                      <Tag
                                        style={{
                                          margin: 0,
                                          fontSize: 12,
                                          padding: '4px 10px',
                                          borderRadius: 6,
                                          background: `${bindingColor}15`,
                                          border: `1px solid ${bindingColor}40`,
                                          color: bindingColor,
                                        }}
                                      >
                                        {dep.setFunction}()
                                      </Tag>
                                    )}
                                    <Tag
                                      style={{
                                        margin: 0,
                                        fontSize: 12,
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        background: `${bindingColor}20`,
                                        border: `1px solid ${bindingColor}40`,
                                        color: bindingColor,
                                      }}
                                    >
                                      {bindingText}
                                    </Tag>
                                  </Space>
                                  {dep.currentAddress && (
                                    <Text
                                      copyable={{
                                        text: dep.currentAddress,
                                        tooltips: ['复制地址', '已复制'],
                                      }}
                                      style={{
                                        fontSize: 12,
                                        fontFamily: 'monospace',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        display: 'block',
                                      }}
                                    >
                                      当前: {dep.currentAddress.slice(0, 10)}...{dep.currentAddress.slice(-8)}
                                    </Text>
                                  )}
                                  {dep.latestAddress && dep.latestAddress !== dep.currentAddress && (
                                    <Text
                                      copyable={{
                                        text: dep.latestAddress,
                                        tooltips: ['复制地址', '已复制'],
                                      }}
                                      style={{
                                        fontSize: 12,
                                        fontFamily: 'monospace',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        display: 'block',
                                      }}
                                    >
                                      最新: {dep.latestAddress.slice(0, 10)}...{dep.latestAddress.slice(-8)}
                                    </Text>
                                  )}
                                </Space>
                              </div>
                            );
                          })}
                        </Space>
                      </Space>
                    </div>
                  );
                })()}

                {/* 操作按钮区域（预留） */}
                <div style={{
                  padding: 20,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 14 }}>
                    通过主界面的"更新地址"按钮进行依赖绑定操作
                  </Text>
                </div>
              </Space>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

export default ContractDependencyTree;
