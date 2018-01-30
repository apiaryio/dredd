/* eslint-disable
    no-console,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.

const express = require('express');

const app = express();


app.get('/machines', (req, res) => res.json([{ type: 'bulldozer', name: 'willy' }]));

app.get('/machines/:name', (req, res) => process.exit(1));


app.listen(process.argv[2], () => console.log(`Dummy server listening on port ${process.argv[2]}!`));
