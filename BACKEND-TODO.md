## 我的資料庫(Supabase 免費 PostgreSQL)
這是一個全新、空的資料庫,連線資訊如下:

連線字串: postgresql://postgres.mllbrxowvabjdknlccqz:Supabase,20220213.@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
host: aws-1-ap-northeast-1.pooler.supabase.com
port: 6543
database: postgres
user: postgres.mllbrxowvabjdknlccqz

## 請依序幫我做這三件事

### 1. 建立資料表
資料庫目前是空的。請依照 API-CONTRACT.md 裡定義的資料格式,設計並建立對應的資料表。
參考資料模型(以 API 規格為準):
- 品牌 brands:id、category(只會是 diaper/food/formula)、name、sentiment(positive/neutral/negative)、has_negative、updated_at
- 系列 series:所屬品牌、name、origin(產地國家)
- 新聞 news_items:所屬品牌、title、source、url
- 社群 social_items:所屬品牌、title、source、url

### 2. 把資料寫進去
admin儲存的品牌就是要交給claude ai去爬資料，把爬完並且整理完的品牌資料寫進對應的資料表。

### 3. 開發後端 API (用Node.js Express開發)
資料就緒後,請依照 API-CONTRACT.md 開發後端,要實作這四個端點:
- GET    /api/brands              (公開,回傳全部品牌)
- POST   /api/brands             (新增品牌,需 Token 驗證)
- DELETE /api/brands/:id         (刪除品牌,需 Token 驗證)
- POST   /api/brands/:id/refresh (觸發更新,需 Token 驗證)

### 4. 串接前端
已經先寫好兩隻前端的.html，要串接寫好的後端API
- admin.html: 維護者操作。維護品牌資料，輸入anthropic api key，AI自動爬資料並且整理 (/Users/jasonyen/Downloads/親子品牌監測/admin-mock.html)
- public.html: 呈現資料給外部使欲者 (/Users/jasonyen/Downloads/親子品牌監測/BACKEND-TODO.md)

### 5. 部署
把網站部署到Vercel

注意事項:
- 回應格式要完全符合 API-CONTRACT.md(欄位名稱、空陣列用 [] 不要用 null)。
- 需要驗證的端點用 Authorization: Bearer <token> 驗證,失敗回 401。