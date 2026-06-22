// 跑 schema.sql 建表。用法：DATABASE_URL=... node scripts/init-db.js
// 或先在專案根目錄放 .env（含 DATABASE_URL），再 npm run init-db。
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 簡易讀取 .env（不引入額外套件）
function loadEnv() {
  const p = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[m[1]] = v;
    }
  }
}

async function main() {
  loadEnv();
  if (!process.env.DATABASE_URL) {
    console.error('請設定 DATABASE_URL（環境變數或 .env）');
    process.exit(1);
  }
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log('✅ 資料表建立完成');
}

main().catch((e) => {
  console.error('❌ 建表失敗：', e.message);
  process.exit(1);
});
