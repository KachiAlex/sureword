const fs = require('fs');
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/log')) {
    const msg = new URL(req.url, 'http://localhost').searchParams.get('msg');
    if (msg) console.log('BROWSER:', msg);
    res.writeHead(200); res.end('ok');
  } else if (req.url === '/test_concat.webm') {
    const file = fs.readFileSync('test_concat.webm');
    res.writeHead(200, { 'Content-Type': 'audio/webm', 'Content-Length': file.length });
    res.end(file);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<body>
  <audio id="a" controls></audio>
  <p id="info">Loading...</p>
  <script>
    const audio = document.getElementById('a');
    const info = document.getElementById('info');
    audio.src = '/test_concat.webm';
    let startTime = 0;
    audio.onloadedmetadata = () => {
      info.textContent = 'Duration: ' + audio.duration + 's';
      startTime = Date.now();
      fetch('/log?msg=duration:' + audio.duration);
    };
    audio.onended = () => {
      const elapsed = Date.now() - startTime;
      info.textContent += ' | ENDED at ' + audio.currentTime.toFixed(2) + 's (real elapsed: ' + elapsed + 'ms)';
      fetch('/log?msg=ended:' + audio.currentTime.toFixed(2) + ',elapsed:' + elapsed);
    };
    audio.onerror = () => {
      info.textContent = 'ERROR: ' + (audio.error ? audio.error.code : 'unknown');
    };
    audio.play().catch(e => info.textContent = 'Play error: ' + e);
  </script>
</body>
</html>`);
  }
});
server.listen(8765, () => console.log('http://localhost:8765'));
setTimeout(() => { server.close(); process.exit(0); }, 30000);
