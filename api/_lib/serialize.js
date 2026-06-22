// 把 DB row 組成 API-CONTRACT 規定的 brand 物件。
// 空集合一律回 []（不是 null），updated_at 回 Number（epoch ms）或 null。
const { query } = require('./db');

function shapeBrand(brandRow, series, news, social) {
  return {
    id: brandRow.id,
    name: brandRow.name,
    sentiment: brandRow.sentiment || 'neutral',
    has_negative: !!brandRow.has_negative,
    series: (series || []).map((s) => ({ name: s.name || '', origin: s.origin || '' })),
    news_items: (news || []).map((n) => ({ title: n.title || '', source: n.source || '', url: n.url || '' })),
    social_items: (social || []).map((s) => ({ title: s.title || '', source: s.source || '', url: s.url || '' })),
    updated_at: brandRow.updated_at == null ? null : Number(brandRow.updated_at),
  };
}

// 取單一品牌的完整物件（含子表）
async function getBrand(id) {
  const b = await query('select * from brands where id = $1', [id]);
  if (b.rowCount === 0) return null;
  const [series, news, social] = await Promise.all([
    query('select name, origin from series where brand_id = $1 order by id', [id]),
    query('select title, source, url from news_items where brand_id = $1 order by id', [id]),
    query('select title, source, url from social_items where brand_id = $1 order by id', [id]),
  ]);
  return shapeBrand(b.rows[0], series.rows, news.rows, social.rows);
}

// 取全部品牌，依 category 分組成 {diaper:[], food:[], formula:[]}
async function getAllGrouped() {
  const [brands, series, news, social] = await Promise.all([
    query('select * from brands order by name'),
    query('select brand_id, name, origin from series order by id'),
    query('select brand_id, title, source, url from news_items order by id'),
    query('select brand_id, title, source, url from social_items order by id'),
  ]);

  const bucket = (rows) => {
    const m = new Map();
    for (const r of rows) {
      if (!m.has(r.brand_id)) m.set(r.brand_id, []);
      m.get(r.brand_id).push(r);
    }
    return m;
  };
  const seriesBy = bucket(series.rows);
  const newsBy = bucket(news.rows);
  const socialBy = bucket(social.rows);

  const out = { diaper: [], food: [], formula: [] };
  for (const row of brands.rows) {
    const shaped = shapeBrand(row, seriesBy.get(row.id), newsBy.get(row.id), socialBy.get(row.id));
    if (out[row.category]) out[row.category].push(shaped);
  }
  return out;
}

module.exports = { shapeBrand, getBrand, getAllGrouped };
