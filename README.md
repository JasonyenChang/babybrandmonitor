# 嬰幼兒用品監測站

追蹤台灣市場 **尿布 / 副食品 / 奶粉** 品牌的輿情監測站。維護者在後台新增品牌，由 Claude AI 自動爬取整理（情緒、產地、新聞、社群），呈現給家長參考。

## 架構

```
public.html ─┐
             ├─► /api/* (Vercel Serverless) ─► Supabase Postgres
admin.html ──┘                           └─► Claude AI (web search)
```

- 前端：純 HTML（`public.html` 公開展示、`admin.html` 維護後台）—— 已串好 API
- 後端：Vercel Serverless Functions（`api/`）
- 資料庫：Supabase Postgres
- 爬蟲：`@anthropic-ai/sdk` + web search，model `claude-sonnet-4-6`

## API（詳見 API-CONTRACT.md）

| 端點 | 驗證 | 說明 |
|------|------|------|
| `GET /api/brands` | 無 | 回傳 `{diaper:[],food:[],formula:[]}` |
| `POST /api/brands` | Bearer | 新增空品牌 `{category,name}` → 201 |
| `DELETE /api/brands/:id` | Bearer | 刪除 → 204 |
| `POST /api/brands/:id/refresh` | Bearer | AI 爬資料更新 → 200 |

需驗證的端點帶 `Authorization: Bearer <ADMIN_TOKEN>`，失敗回 401。

## 環境變數（見 .env.example）

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | Supabase Transaction pooler 連線字串 (port 6543) |
| `ADMIN_TOKEN` | 管理者 Token（保護寫入端點） |
| `ANTHROPIC_API_KEY` | Claude API Key（只在後端用） |

## 本地設定 / 建表

```bash
npm install
cp .env.example .env      # 填入三個變數
npm run init-db           # 跑 schema.sql 建 4 張表
```

## 部署 Vercel

```bash
npm i -g vercel
vercel                    # 首次連結專案
# 在 Vercel 後台 Project Settings → Environment Variables
# 設定 DATABASE_URL / ADMIN_TOKEN / ANTHROPIC_API_KEY
vercel --prod
```

部署後：
- `/` 或 `/public.html` → 公開頁
- `/admin` 或 `/admin.html` → 後台（在 Token 欄貼上 `ADMIN_TOKEN`）

## 60 秒限制

Vercel Hobby Serverless 上限 60 秒。`refresh` 的爬蟲已做對應控制：
`claude-sonnet-4-6`、web search `max_uses=4`、client timeout 55 秒、只取最新 4~5 則。
若品牌很多家想加速，可升級 Vercel Pro（`maxDuration` 可拉到 300 秒）。

## 安全

- `.env` 已列入 `.gitignore`，**不要 commit**。
- 連線字串、API Key、Token 一律走環境變數。
