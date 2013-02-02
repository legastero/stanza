var xmpp = require('./src/xmpp'),
    express = require('express'),
    socket = require('socket.io');

var app = express();    

var server = app.listen(3000);
var io = socket.listen(server);
xmpp.use(io);

app.set('view engine', 'jade');

app.configure(function(){
	app.use(express.static(__dirname + '/../public'));
	app.set('views', __dirname + '/views');
});

app.get('/', function(req, res) {
    res.render('index');
}); 
