# IMS API

移民管理系统的后端，对接 [Ims-fd](https://github.com/YoungLee-coder/Ims-fd) 前端。运行在 Cloudflare Workers 上，业务数据在 D1（SQLite），上传文件在 R2。

接口前缀是 `/api/v1`，错误体是 `{ code, message, fieldErrors? }`，分页是 `{ items, total, page, pageSize }`。工作人员和申请人门户使用两套 JWT，互不通用。

## 本地启动

```bash
cd backend
npm install
npx wrangler d1 migrations apply ims --local
npm run dev
```

第一次请求会写入演示数据。默认地址是 `http://127.0.0.1:8787`。

前端 `.env.local`：

```bash
NEXT_PUBLIC_API_MOCK=false
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8787/api/v1
```

| 入口 | 账号 | 密码 |
| --- | --- | --- |
| 工作人员 | `admin` | `Admin@2026` |
| 签证审核官 | `zhou.anlan` | `Officer@2026` |
| 督察审计员 | `song.zhiwei` | `Officer@2026` |
| 待审核（不能登录） | `han.yizhou` | `Officer@2026` |
| 申请人门户 | `priya.mehta@fastmail.in` | `Applicant@2026` |

## 部署到 Cloudflare

1. `npx wrangler login`
2. `npx wrangler d1 create ims`，把返回的 `database_id` 写进 `wrangler.toml`
3. `npx wrangler r2 bucket create ims-files`
4. `npx wrangler secret put JWT_SECRET`
5. `npm run db:migrate:remote`
6. `npm run deploy`

部署完成后把前端的 `NEXT_PUBLIC_API_BASE_URL` 改成 `https://<worker 域名>/api/v1`。

接口说明见 [API.md](./API.md)。

## 已实现的接口

与前端 `src/lib/api/endpoints.ts` 一致：

- 工作人员：`/auth/*`、`/users`、`/roles`、`/permissions`、`/applicants`、`/documents`、`/dashboard/summary`
- 门户：`/portal/auth/*`、`/portal/applications`（草稿、提交、撤回、删除、材料上传）
- 文件：`GET /files/:id`

课程模块图里前端还没接上、但后端已经提供的接口：

- `GET /applications`、`GET /applications/:id`、`POST /applications/:id/decision`
  - `action`: `start_review` | `request_supplement` | `approve` | `reject`
  - 通过时如果还没有档案编号，会自动建档并回填 `fileNo`
- `GET /reports`：申请量、通过率、平均处理天数
- `GET /notifications`、`POST /notifications/:id/read`（门户路径前加 `/portal`）
- `GET /audit-logs`：登录、审批、建档等写操作

越权读取别人的门户申请返回 404。
