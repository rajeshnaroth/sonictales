var express = require('express')
var path = require('path')

var app = express()
app.set('view engine', 'pug')
app.set("views", path.join(__dirname, "views"))

app.get('/', (req, res) => {
    console.log(req.headers)
    res.render('index', { title:'Sonic Tales', message: 'hello'})
})

app.listen(3333, () => console.log('Listening on 3333'))
