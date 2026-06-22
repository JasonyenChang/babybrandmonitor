// DELETE /api/brands/:id  -> 需 Token，刪除品牌（子表 cascade），回 204
const { query } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'DELETE') {
      res.setHeader('Allow', 'DELETE');
      return res.status(405).json({ error: '方法不允許' });
    }
    requireAuth(req);
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ error: '缺少品牌 id' });
    }
    await query('delete from brands where id = $1', [id]);
    return res.status(204).end();
  } catch (err) {
    const status = err.status || 500;
    console.error('[/api/brands/:id DELETE]', err);
    return res.status(status).json({ error: err.message || '伺服器錯誤' });
  }
};
