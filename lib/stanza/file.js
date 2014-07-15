'use strict';

var stanza = require('jxt');
var util = require('./util');
var jingle = require('./jingle');
var Hash = require('./hash');


var NS = 'urn:xmpp:jingle:apps:file-transfer:3';
var TB_NS = 'urn:xmpp:thumbs:0';


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

exports.Thumbnail = stanza.define({
    name: 'thumbnail',
    namespace: TB_NS,
    element: 'thumbnail',
    fields: {
        cid: stanza.attribute('cid'),
        mimeType: stanza.attribute('mime-type'),
        width: stanza.numberAttribute('width'),
        height: stanza.numberAttribute('height')
    }
});

exports.FileTransfer = stanza.define({
    name: '_filetransfer',
    namespace: NS,
    element: 'description',
    fields: {
        descType: {value: 'filetransfer'},
        offer: util.subExtension('offer', NS, 'offer', exports.File),
        request: util.subExtension('request', NS, 'request', exports.File)
    }
});


jingle.registerDescription(exports.FileTransfer);

stanza.extend(exports.File, Hash, 'hashes');
stanza.extend(exports.File, exports.Range);
stanza.extend(exports.File, exports.Thumbnail);
stanza.extend(jingle.Content, exports.FileTransfer);
