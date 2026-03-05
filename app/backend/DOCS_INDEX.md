# SuperCrypto Backend 文档索引

> 后端项目所有文档的汇总导航

## 📚 本目录文档

| 文档 | 说明 | 最后更新 |
|------|------|----------|
| [README.md](./README.md) | 项目简介、快速开始、功能概览 | 2025-10 |
| [GUIDE.md](./GUIDE.md) | 开发者指南、架构设计、代码规范 | 2025-10 |
| [AERICH_GUIDE.md](./AERICH_GUIDE.md) | Aerich 数据库迁移工具指南 | 2025-11 |
| [API_ROUTES.md](./API_ROUTES.md) | API 路由结构文档（新版 v2） | 2025-12 |
| [SUBSCRIPTION_V2_GUIDE.md](../../docs/backend/SUBSCRIPTION_V2_GUIDE.md) | 认购 V2 全链路（pending/receipt/confirm）与一致性策略 | 2026-03 |

### 子目录文档

| 文档 | 说明 |
|------|------|
| [src/models/README.md](./src/models/README.md) | 通用审计系统设计文档 |
| [contracts/oracle/README.md](./contracts/oracle/README.md) | RWA 预言机合约系统文档 |

---

## 📖 文档说明

### 1. README.md - 项目入门

**适合人群**: 新人、产品经理、外部合作者

**内容概览**:
- 项目简介和核心功能
- 快速开始（安装、配置、启动）
- API 端点示例
- 技术栈和安全注意事项

### 2. GUIDE.md - 开发者指南

**适合人群**: 后端开发者

**内容概览**:
- 架构设计（轻量级 DDD）
- 目录结构和分层架构
- 数据流与调用链
- 领域设计（账户、钱包、交易、资产、KYC、质押、认购）
- 开发最佳实践
- 测试和部署

### 3. AERICH_GUIDE.md - 数据库迁移

**适合人群**: 后端开发者、DBA

**内容概览**:
- Aerich 配置和使用流程
- 迁移命令速查
- 故障排除

### 4. API_ROUTES.md - API 路由文档

**适合人群**: 前端开发者、后端开发者、测试人员

**内容概览**:
- 新版 URL 结构（v2）
- 公开接口、用户接口、管理员接口分类
- 认证机制说明
- 路由映射表

### 5. SUBSCRIPTION_V2_GUIDE.md - 认购 V2 专项文档（已迁移）

**适合人群**: 前端开发者、后端开发者、测试人员、产品

**内容概览**:
- V2 认购三段式流程（pending/receipt/confirm）
- 前后端状态机与时序
- 防绕过与台账一致性策略
- 接口示例与联调清单

### 6. src/models/README.md - 审计系统

**适合人群**: 后端开发者、合规人员

**内容概览**:
- 通用审计日志系统设计
- 双表设计（状态表 + 审计表）
- 使用示例和查询方法
- 扩展指南

### 7. contracts/oracle/README.md - 预言机系统

**适合人群**: 智能合约开发者

**内容概览**:
- RWA 预言机合约列表和功能
- 部署和使用流程
- 安全特性（多签、时间锁）

---

## 🔗 与项目文档的关系

后端文档主要关注实现细节，项目级文档请查看：

```
docs/
├── architecture.md           # 整体架构
├── prd.md                   # 产品需求文档
├── tech-spec-*.md           # 技术规格
├── ux-design-*.md           # UX 设计
├── sprint-artifacts/        # Sprint 产出物
└── README.md                # 文档中心导航
```

### BMAD 工作流规则

项目使用 BMAD 方法进行敏捷开发，规则文件位于：

```
.cursor/rules/bmad/
├── core/          # 核心代理和工具
│   ├── agents/    # bmad-master
│   ├── tasks/     # 高级任务
│   ├── tools/     # 工具
│   └── workflows/ # 核心工作流
├── bmb/           # BMAD Builder Module
│   ├── agents/    # bmad-builder
│   └── workflows/ # 创建/编辑代理和工作流
├── bmm/           # BMAD Method Module
│   ├── agents/    # analyst, architect, dev, pm, sm, tea, tech-writer, ux-designer
│   └── workflows/ # 产品、架构、开发、测试工作流
├── cis/           # Creative & Innovation Suite
│   ├── agents/    # 创意相关代理
│   └── workflows/ # 创意工作流
└── index.mdc      # 模块索引
```

**常用工作流**:
- `@bmad/bmm/workflows/quick-dev` - 快速开发
- `@bmad/bmm/workflows/code-review` - 代码审查
- `@bmad/bmm/workflows/create-architecture` - 创建架构
- `@bmad/bmm/workflows/sprint-planning` - Sprint 规划

---

## 📝 文档维护规范

### 更新时机

1. **API 变更**: 同步更新 `API_ROUTES.md` 和 `README.md` 中的示例
2. **架构变更**: 同步更新 `GUIDE.md` 中的架构图和说明
3. **模型变更**: 同步更新 `src/models/README.md`
4. **新功能**: 评估是否需要新增文档

### 同步检查清单

- [ ] API 路径与代码一致
- [ ] 示例代码可运行
- [ ] 架构图反映当前设计
- [ ] BMAD 工作流与实际流程一致

---

## 🆕 最近更新

| 日期 | 文档 | 变更 |
|------|------|------|
| 2026-03-05 | SUBSCRIPTION_V2_GUIDE.md | 新增：认购 V2 全链路与一致性治理文档 |
| 2026-03-05 | SUBSCRIPTION_V2_GUIDE.md | 更新：新增 subscription 主动对账任务说明 |
| 2025-12-22 | API_ROUTES.md | v2.1: Account/Transaction 迁移到 admin |
| 2025-12-22 | API_ROUTES.md | v2.0: 路由结构文档 |
| 2025-12-22 | DOCS_INDEX.md | 新增：文档索引 |

---

**维护者**: SuperCrypto 开发团队  
**最后更新**: 2026-03-05

