'use strict';

var NS = 'urn:xmpp:jingle:apps:file-transfer:3';
var TB_NS = 'urn:xmpp:thumbs:0';


module.exports = function (stanza) {
    var types = stanza.utils;

    var File = stanza.define({
        name: '_file',
        namespace: NS,
        element: 'file',
        fields: {
            name: types.textSub(NS, 'name'),
            desc: types.textSub(NS, 'desc'),
            size: types.numberSub(NS, 'size'),
            date: types.dateSub(NS, 'date')
        }
    });
    
    var Range = stanza.define({
        name: 'range',
        namespace: NS,
        element: 'range',
        fields: {
            offset: types.numberAttribute('offset')
        }
    });
    
    var Thumbnail = stanza.define({
        name: 'thumbnail',
        namespace: TB_NS,
        element: 'thumbnail',
        fields: {
            cid: types.attribute('cid'),
            mimeType: types.attribute('mime-type'),
            width: types.numberAttribute('width'),
            height: types.numberAttribute('height')
        }
    });
    
    var FileTransfer = stanza.define({
        name: '_filetransfer',
        namespace: NS,
        element: 'description',
        tags: ['jingle-description'],
        fields: {
            descType: {value: 'filetransfer'},
            offer: types.subExtension('offer', NS, 'offer', File),
            request: types.subExtension('request', NS, 'request', File)
        }
    });
    
    stanza.extend(File, Range);
    stanza.extend(File, Thumbnail);

    stanza.withDefinition('hash', 'urn:xmpp:hashes:1', function (Hash) {
        stanza.extend(File, Hash, 'hashes');
    });

    stanza.withDefinition('content', 'urn:xmpp:jingle:1', function (Content) {
        stanza.extend(Content, FileTransfer);
    });
};
