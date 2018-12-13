import * as NS from '../namespaces';

const FT_NS = NS.FILE_TRANSFER_3;

export default function(JXT) {
    const Utils = JXT.utils;

    const File = JXT.define({
        element: 'file',
        fields: {
            date: Utils.dateSub(FT_NS, 'date'),
            desc: Utils.textSub(FT_NS, 'desc'),
            name: Utils.textSub(FT_NS, 'name'),
            size: Utils.numberSub(FT_NS, 'size')
        },
        name: '_file',
        namespace: FT_NS
    });

    const Range = JXT.define({
        element: 'range',
        fields: {
            offset: Utils.numberAttribute('offset')
        },
        name: 'range',
        namespace: FT_NS
    });

    const Thumbnail = JXT.define({
        element: 'thumbnail',
        fields: {
            cid: Utils.attribute('cid'),
            height: Utils.numberAttribute('height'),
            mimeType: Utils.attribute('mime-type'),
            width: Utils.numberAttribute('width')
        },
        name: 'thumbnail',
        namespace: NS.THUMBS_0
    });

    const FileTransfer = JXT.define({
        element: 'description',
        fields: {
            applicationType: {
                value: 'filetransfer',
                writable: true
            },
            offer: Utils.subExtension('offer', FT_NS, 'offer', File),
            request: Utils.subExtension('request', FT_NS, 'request', File)
        },
        name: '_filetransfer',
        namespace: FT_NS,
        tags: ['jingle-application']
    });

    JXT.extend(File, Range);
    JXT.extend(File, Thumbnail);

    JXT.withDefinition('hash', NS.HASHES_1, function(Hash) {
        JXT.extend(File, Hash, 'hashes');
    });

    JXT.withDefinition('content', NS.JINGLE_1, function(Content) {
        JXT.extend(Content, FileTransfer);
    });
}
