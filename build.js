var browserify = require('browserify');
var UglifyJS = require('uglify-js');
var fs = require('fs');


var bundle = browserify();
bundle.add('./index');
bundle.bundle({standalone: 'XMPP'}, function (err, js) {
    fs.writeFileSync('build/stanzaio.bundle.js', js);
    var min = UglifyJS.minify(js, {fromString: true}).code;
    fs.writeFileSync('build/stanzaio.bundle.min.js', min);
});
