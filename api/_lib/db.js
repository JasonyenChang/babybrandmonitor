// Postgres 連線池（serverless 友善：模組層單例，跨 invocation 重用）
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL 環境變數未設定');
    }
    pool = new Pool({
      connectionString,
      // Supabase pooler 需要 SSL；憑證鏈在 serverless 環境常驗不過，放寬。
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, query };
