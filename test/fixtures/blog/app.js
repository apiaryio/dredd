const express = require('express');


const app = express();

app.get('/articles', (req, res) => {
  res.json([{ id: 1, title: 'Creamy cucumber salad', text: 'Slice cucumbers…' }]);
});

app.post('/articles', (req, res) => {
  if (req.headers.authorization) {
    res.status(201).json({ id: 2, title: 'Crispy schnitzel', text: 'Prepare eggs…' });
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
});


app.listen(3000, () => console.log('http://127.0.0.1:3000'));
