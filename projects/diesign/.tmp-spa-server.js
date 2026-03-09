const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve('C:/Users/SKIKK/Documents/websites/Playground/projects/diesign/dist');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
};
function sendFile(res, target) {
  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
}
http.createServer((req, res) => {
  const reqPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relative = reqPath.replace(/^\/+/, '');
  const primary = path.resolve(root, relative || 'index.html');
  const nestedIndex = path.resolve(root, relative, 'index.html');
  const fallback = path.resolve(root, 'index.html');
  const candidates = [primary, nestedIndex, fallback];
  for (const filePath of candidates) {
    if (!filePath.startsWith(root)) continue;
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath);
      return;
    }
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}).listen(9012, '127.0.0.1');