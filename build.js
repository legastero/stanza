var bundle = require('browserify')();
var fs = require('fs');


bundle.add('./index');
bundle.bundle({standalone: 'XMPP'}).pipe(fs.createWriteStream('stanzaio.bundle.js'));
