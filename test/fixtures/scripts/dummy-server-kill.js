const express = require('express');

const app = express();

app.get('/machines', (req, res) => {
  res.json([{ type: 'bulldozer', name: 'willy' }]);
});

app.get('/machines/:name', () => {
  process.kill(process.pid, 'SIGKILL');
});

app.listen(process.argv[2], () => {
  process.stdout.write(`Dummy server listening on port ${process.argv[2]}!\n`);
});
