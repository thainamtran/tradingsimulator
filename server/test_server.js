const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

server.listen(3002, () => {
  console.log('Server running at http://127.0.0.1:3002/');
  setInterval(() => {
      console.log('heartbeat');
  }, 5000);
});
