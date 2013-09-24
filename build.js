var browserify = require('browserify');
var UglifyJS = require('uglify-js');
var fs = require('fs');


var bundle = browserify();
bundle.add('./index');
bundle.bundle({standalone: 'XMPP'}, function (err, js) {
    var result = UglifyJS.minify(js, {fromString: true}).code;
    fs.writeFileSync('stanzaio.bundle.js', result);
});
