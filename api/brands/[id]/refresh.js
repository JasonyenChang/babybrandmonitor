// POST /api/brands/:id/refresh -> 需 Token
//   呼叫 Claude 爬該品牌資料 -> 覆寫子表 + 更新品牌 -> 回 200 完整 brand
const { getPool, query } = require('../../_lib/db');
const { requireAuth } = require('../../_lib/auth');
const { getBrand } = require('../../_lib/serialize');
const { crawlBrand } = require('../../_lib/crawler');

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: '方法不允許' });
    }
    requireAuth(req);

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: '缺少品牌 id' });

    const found = await query('select id, name, category from brands where id = $1', [id]);
    if (found.rowCount === 0) {
      return res.status(404).json({ error: '找不到此品牌' });
    }
    const { name, category } = found.rows[0];

    // 1. 爬資料（限時 ~55s）
    const result = await crawlBrand(name, category);

    // 2. 交易寫入：清掉舊子表 -> 寫新子表 -> 更新品牌
    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query('delete from series where brand_id = $1', [id]);
      await client.query('delete from news_items where brand_id = $1', [id]);
      await client.query('delete from social_items where brand_id = $1', [id]);

      for (const s of result.series) {
        await client.query('insert into series (brand_id, name, origin) values ($1,$2,$3)', [id, s.name, s.origin]);
      }
      for (const n of result.news_items) {
        await client.query('insert into news_items (brand_id, title, source, url) values ($1,$2,$3,$4)', [id, n.title, n.source, n.url]);
      }
      for (const s of result.social_items) {
        await client.query('insert into social_items (brand_id, title, source, url) values ($1,$2,$3,$4)', [id, s.title, s.source, s.url]);
      }
      await client.query(
        'update brands set sentiment = $1, has_negative = $2, updated_at = $3 where id = $4',
        [result.sentiment, result.has_negative, Date.now(), id]
      );
      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }

    const brand = await getBrand(id);
    return res.status(200).json(brand);
  } catch (err) {
    const status = err.status || 500;
    console.error('[/api/brands/:id/refresh]', err);
    return res.status(status).json({ error: err.message || '更新失敗' });
  }
};
