// GET  /api/brands  -> 公開，回傳 {diaper:[],food:[],formula:[]}
// POST /api/brands  -> 需 Token，新增空品牌，回 201 + brand 物件
const crypto = require('crypto');
const { query } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');
const { getAllGrouped, getBrand } = require('../_lib/serialize');

const VALID_CATEGORIES = ['diaper', 'food', 'formula'];

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const data = await getAllGrouped();
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      requireAuth(req);
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const category = body.category;
      const name = (body.name || '').trim();
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'category 必須是 diaper / food / formula' });
      }
      if (!name) {
        return res.status(400).json({ error: '品牌名稱不可為空' });
      }
      const id = crypto.randomBytes(8).toString('hex');
      await query(
        'insert into brands (id, category, name, sentiment, has_negative, updated_at) values ($1,$2,$3,$4,$5,$6)',
        [id, category, name, 'neutral', false, null]
      );
      const brand = await getBrand(id);
      return res.status(201).json(brand);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: '方法不允許' });
  } catch (err) {
    const status = err.status || 500;
    console.error('[/api/brands]', err);
    return res.status(status).json({ error: err.message || '伺服器錯誤' });
  }
};
