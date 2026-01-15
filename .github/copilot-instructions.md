# Copilot instructions — SuperCrypto

Purpose: quickly orient AI coding assistants to be productive in this repo.

1) Big picture
- Frontend: Next.js app at `app/frontend/nextjs` (App Router, Wagmi for wallet).  Use `npm run dev` to run locally.
- Backend: FastAPI service at `app/backend` (async, Tortoise ORM, Aerich migrations). Entry point: `app/backend/main.py`.
- Smart contracts & testchain: `hardhat/` for local node; contract sources live under `app/backend/contracts` and `app/backend/scripts` contains deploy helpers (e.g. `deploy_project.py`).
- Database & infra: PostgreSQL (primary), optional Redis cache. DB models and business logic are under `app/backend/src/models` and `app/backend/src/domains`.

2) Key developer workflows & commands (copyable)
- Start local hardhat node:
  - `./hardhat/hardhat-node.sh start-local`
- Backend setup & run (dev):
  - create venv, install deps: `pip install -r app/backend/requirements.txt`
  - run migrations: `aerich init -t src.db.TORTOISE_ORM && aerich init-db` (or `aerich migrate && aerich upgrade`)
  - run API: `python app/backend/main.py` (or `uvicorn main:app --reload` inside `app/backend`).
- Deploy contracts (local/test):
  - `python app/backend/scripts/deploy_project.py --project <fake|mock|common> --network local`
  - Ape tasks exist (see `ape-config.yaml`) for some flows.
- Frontend: `cd app/frontend/nextjs && npm install && npm run dev`.

3) Project-specific patterns & conventions
- Contracts grouped by project: `common` (shared), `mock` (test tokens), `fake` (business demo).
- **合约模型** (位于 `src/models/contracts/`):
  - `Contract` — 合约部署记录 (name, address, chain_id, project_name, status)
  - `ContractDependency` — 合约间依赖绑定关系 (contract_id ↔ dependency_id, is_binded)
  - `ProjectContracts` — 项目合约元数据 (public_func, private_func, event) **[WIP]**
  - ⚠️ 旧表 `DeployInfo` / `ContractBinding` 已弃用，勿再使用。
- Domain structure: backend uses a DDD-like layout — `src/api` (routes), `src/domains` (business), `src/models` (Tortoise models), `src/shared` (utils, middleware). Follow existing layering when adding features.
- Scheduler & background jobs: uses internal `falib.adapter.scheduler.SchedulerService` — background tasks (contract metadata sync, periodic jobs) are scheduled via that service (see `src/tasks/contract_task.py`).
- Config & environment: `config.local.yaml` (dev) and `config.prod.yaml` (prod). The code reads settings from `falib.utils.config.SETTINGS` — prefer using existing config keys.
- Auth & errors: `AuthStateMiddleware` injects auth into `request.state`. Business errors use `BusinessException` for structured JSON responses (see `app/backend/main.py`).

4) Integration points and external deps to watch
- Internal library: `falib` (used heavily for scheduler, config and adapters). See `.bmad` and `.cursor/rules/falib.mdc` for docs and rules referencing `falib` usage.
- Blockchain tooling: `hardhat`, `ape`, `vyper` contracts. Make sure local RPC (`hardhat-node.sh`) is running for contract-related flows.
- Database migrations: `aerich` for Tortoise ORM. Use `aerich` commands to create/upgrade schema.

5) When editing contracts or deployment
- Update scripts under `app/backend/scripts/` and ensure `Contract` / `ContractDependency` DB rows reflect new addresses and bindings.
- Admin UI 会显示依赖"未绑定"状态，通过 `is_binded` 字段和 `DEPENDENCY_SET_FUNCTIONS` 配置调用对应 `setXXX` 函数。

6) Useful files to inspect when working on features
- `app/backend/main.py` — application lifecycle, CORS, middleware, exception handlers.
- `app/backend/src/api/v1/router.py` — main API router and versioning.
- `app/backend/scripts/deploy_project.py` — canonical deploy flow for local/test networks.
- `hardhat/hardhat-node.sh` — start local chain for integration tests.
- `app/backend/src/tasks/contract_task.py` — contract sync and scheduled jobs.

7) Quick debugging tips
- Health endpoint: `GET /health` (checks DB connectivity). API docs: `GET /docs`.
- When contract addresses change, Admin 页面会根据 `ContractDependency.is_binded` 标记绑定状态 — 通过 Admin 界面或 API 触发绑定。
- For exceptions, enable `debug` in `config.local.yaml` to get detailed traces in `/docs` and logs.

If anything here is unclear or you'd like more detail on a specific area (middleware, deploy scripts, or `falib` usage), tell me which part to expand.
