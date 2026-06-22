// 用 Claude + web search 爬一個品牌的輿情資料，整理成 API-CONTRACT 的結構。
// 設計重點：控制在 60 秒內（Vercel Hobby Serverless 上限）。
//   - 用 claude-sonnet-4-6（比 Opus 快）
//   - web_search max_uses 限制查詢次數
//   - structured output 強制回傳合規 JSON
//   - client timeout 設 55 秒，逼近平台上限前放棄，避免 502
const Anthropic = require('@anthropic-ai/sdk');

const RESULT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    has_negative: { type: 'boolean' },
    series: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          origin: { type: 'string' },
        },
        required: ['name', 'origin'],
      },
    },
    news_items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          source: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['title', 'source', 'url'],
      },
    },
    social_items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          source: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['title', 'source', 'url'],
      },
    },
  },
  required: ['sentiment', 'has_negative', 'series', 'news_items', 'social_items'],
};

const CATEGORY_ZH = { diaper: '尿布', food: '副食品', formula: '奶粉' };

function buildPrompt(name, category) {
  const catZh = CATEGORY_ZH[category] || category;
  return [
    `你是台灣母嬰市場的輿情分析師。請查詢「${name}」這個${catZh}品牌的最新狀況，整理成結構化資料。`,
    '',
    '請搜尋並整理：',
    '1. series：該品牌目前在台灣販售的主要產品系列，每個系列標出主要產地（國家，用繁體中文，例如「日本」「台灣」「中國」）。最多列 5 個系列。',
    '2. news_items：近期相關新聞（最多 4 則）。title 為新聞標題，source 為來源媒體，url 為連結（查不到連結就給空字串）。',
    '3. social_items：近期社群討論（Dcard、PTT、Threads、FB 社團、Mobile01 等，最多 4 則）。',
    '4. sentiment：綜合判斷整體輿情：positive(正常/正面)、neutral(普通/中性)、negative(有明顯負面或爭議)。',
    '5. has_negative：是否存在負面新聞或爭議（產地變更爭議、瑕疵、召回、消費者抱怨等）。',
    '',
    '注意：',
    '- 只整理查得到的真實資料，查不到的欄位給空陣列或空字串，不要捏造。',
    '- 全部用繁體中文。',
    '- 特別留意「產地變更」這類家長敏感議題。',
  ].join('\n');
}

// 從回應 content 取出 structured output 的 JSON 文字
function extractJson(message) {
  for (const block of message.content || []) {
    if (block.type === 'text' && block.text) {
      try {
        return JSON.parse(block.text);
      } catch (_) {
        // 試著從文字裡撈出第一個 JSON 物件
        const m = block.text.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
      }
    }
  }
  return null;
}

function sanitize(data) {
  const arr = (x) => (Array.isArray(x) ? x : []);
  const str = (x) => (typeof x === 'string' ? x : '');
  const sentiment = ['positive', 'neutral', 'negative'].includes(data && data.sentiment)
    ? data.sentiment
    : 'neutral';
  return {
    sentiment,
    has_negative: !!(data && data.has_negative),
    series: arr(data && data.series).slice(0, 8).map((s) => ({ name: str(s && s.name), origin: str(s && s.origin) })),
    news_items: arr(data && data.news_items).slice(0, 8).map((n) => ({ title: str(n && n.title), source: str(n && n.source), url: str(n && n.url) })),
    social_items: arr(data && data.social_items).slice(0, 8).map((s) => ({ title: str(s && s.title), source: str(s && s.source), url: str(s && s.url) })),
  };
}

async function crawlBrand(name, category) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const e = new Error('後端未設定 ANTHROPIC_API_KEY');
    e.status = 500;
    throw e;
  }
  // client timeout 55s：留 5 秒給回傳與寫庫，逼近平台 60s 上限前先放棄。
  const client = new Anthropic({ apiKey, timeout: 55 * 1000, maxRetries: 0 });

  const baseParams = {
    model: 'claude-sonnet-4-6',
    max_tokens: 3500,
    // 為了壓在 60 秒內：關閉 thinking、effort low、用「基本版」web search（不跑
    // dynamic-filtering 的 code execution，較快），並限制搜尋次數。
    thinking: { type: 'disabled' },
    output_config: { format: { type: 'json_schema', schema: RESULT_SCHEMA }, effort: 'low' },
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 2 }],
  };

  let messages = [{ role: 'user', content: buildPrompt(name, category) }];
  let message;
  // 處理 server-tool 的 pause_turn：最多續跑幾次。
  for (let i = 0; i < 4; i++) {
    message = await client.messages.create({ ...baseParams, messages });
    if (message.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: message.content }];
      continue;
    }
    break;
  }

  if (message && message.stop_reason === 'refusal') {
    const e = new Error('AI 拒絕處理此品牌查詢');
    e.status = 502;
    throw e;
  }

  const data = extractJson(message);
  if (!data) {
    const e = new Error('AI 回傳格式無法解析');
    e.status = 502;
    throw e;
  }
  return sanitize(data);
}

module.exports = { crawlBrand };
