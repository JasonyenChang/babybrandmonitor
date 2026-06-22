# API 規格

前端（admin.html / public.html）已經照這份規格寫好，會直接呼叫下面這些路徑。後端用什麼語言、什麼資料庫都可以，只要回應符合這個格式即可接上。

預設前端假設 API 路徑是相對路徑 `/api/...`（跟前端同網域）。如果後端是部署在別的網域，請把 admin.html / public.html 最上面 `const API_BASE = '/api';` 改成完整網址，例如 `https://your-api.example.com/api`。

---

## GET /api/brands

公開、不需要驗證任何人都能呼叫。回傳目前全部品牌資料。

**回應 200：**
```json
{
  "diaper": [ /* brand物件陣列 */ ],
  "food": [ /* brand物件陣列 */ ],
  "formula": [ /* brand物件陣列 */ ]
}
```

**brand 物件格式：**
```json
{
  "id": "字串，唯一識別碼",
  "name": "品牌名稱",
  "sentiment": "positive | neutral | negative",
  "has_negative": true,
  "series": [
    { "name": "系列名稱", "origin": "國家，例如：日本" }
  ],
  "news_items": [
    { "title": "新聞標題", "source": "來源（可空字串）", "url": "連結（可空字串）" }
  ],
  "social_items": [
    { "title": "討論主題", "source": "平台名稱", "url": "連結" }
  ],
  "updated_at": 1719000000000
}
```
`series` / `news_items` / `social_items` 沒有資料時請回傳空陣列 `[]`，不要省略欄位或回傳 `null`。

---

## POST /api/brands

新增一個品牌。**需要管理者權限**（見下方驗證機制）。

**Request body：**
```json
{ "category": "diaper", "name": "好奇 Huggies" }
```
`category` 只會是 `diaper` / `food` / `formula` 三者之一。

**回應 201：** 回傳新建立的 brand 物件（除了 id/name，其餘欄位可以先給空值：`sentiment` 給 `"neutral"`，陣列給 `[]`）

---

## DELETE /api/brands/:id

刪除指定品牌。**需要管理者權限**。

**回應 204：** 無內容即可

---

## POST /api/brands/:id/refresh

觸發這個品牌的資料更新（要去哪裡查、怎麼查，完全由後端決定——可以是AI查詢、人工資料庫、串接別的服務，前端不管這段邏輯）。**需要管理者權限**。

**回應 200：** 回傳更新後的完整 brand 物件（格式同上）

---

## 驗證機制（管理者權限）

前端目前的做法：管理版頁面上方有一個輸入框，讓使用者貼一段Token，存在瀏覽器的 localStorage。每次呼叫上面標示「需要管理者權限」的請求時，會在 header 帶上：

```
Authorization: Bearer <貼進去的那串文字>
```

這組Token要怎麼驗證（固定字串比對、JWT、或其他方式）由後端決定。如果驗證失敗，請回應 **401**，前端會顯示「Token錯誤或已過期」。

---

## 錯誤格式

如果請求失敗，建議回應格式：
```json
{ "error": "錯誤訊息文字" }
```
前端會直接把 `error` 內容顯示出來，方便除錯。
