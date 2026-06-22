// Bearer Token 驗證：固定字串比對。失敗丟出帶 status 的錯誤，由 handler 轉成 401。

function requireAuth(req) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    const e = new Error('後端未設定 ADMIN_TOKEN');
    e.status = 500;
    throw e;
  }
  const header = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  const token = m ? m[1].trim() : '';
  if (token !== expected) {
    const e = new Error('Token錯誤或已過期');
    e.status = 401;
    throw e;
  }
}

module.exports = { requireAuth };
