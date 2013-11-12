var browserify = require('browserify');
var UglifyJS = require('uglify-js');
var fs = require('fs');


var bundle = browserify();
bundle.add('./index');
bundle.bundle({standalone: 'XMPP'}, function (err, js) {
    fs.writeFileSync('stanzaio.bundle.js', js);
    var min = UglifyJS.minify(js, {fromString: true}).code;
    fs.writeFileSync('stanzaio.bundle.min.js', min);
});
