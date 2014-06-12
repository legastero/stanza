'use strict';

var stanza = require('jxt');
var util = require('./util');
var jingle = require('./jingle');
var Hash = require('./hash');


var NS = 'urn:xmpp:jingle:apps:file-transfer:3';


exports.File = stanza.define({
    name: '_file',
    namespace: NS,
    element: 'file',
    fields: {
        name: stanza.subText(NS, 'name'),
        desc: stanza.subText(NS, 'desc'),
        size: stanza.numberSub(NS, 'size'),
        date: stanza.dateSub(NS, 'date')
    }
});

exports.Range = stanza.define({
    name: 'range',
    namespace: NS,
    element: 'range',
    fields: {
        offset: stanza.numberAttribute('offset')
    }
});

exports.FileTransfer = stanza.define({
    name: '_filetransfer',
    namespace: NS,
    element: 'description',
    fields: {
        descType: {value: 'file'},
        offer: util.subExtension('offer', NS, 'offer', exports.File),
        request: util.subExtension('request', NS, 'request', exports.File)
    }
});


stanza.extend(exports.File, Hash, 'hashes');
stanza.extend(exports.File, exports.Range);
stanza.extend(jingle.Content, exports.FileTransfer);
