const express = require('express');

require('./handle-windows-sigint.js')();

function ignore() {
  console.log('ignoring termination');
}

process.on('SIGTERM', ignore);
process.on('SIGINT', ignore);

const app = express();

app.get('/machines', (req, res) => {
  res.json([{ type: 'bulldozer', name: 'willy' }]);
});

app.get('/machines/:name', (req, res) => {
  res.json({ type: 'bulldozer', name: req.params.name });
});

app.listen(process.argv[2], () => {
  console.log(`Dummy server listening on port ${process.argv[2]}!`);
});
