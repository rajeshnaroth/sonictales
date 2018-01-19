var express = require('express');
var app = express();

app.get('/', (req, res) => res.send('Hello'));
app.listen(3333, () => console.log('Listening on 3333'));
