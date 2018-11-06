import * as NS from '../namespaces';


const FT_NS = NS.FILE_TRANSFER_3;


export default function (JXT) {

    const Utils = JXT.utils;

    const File = JXT.define({
        name: '_file',
        namespace: FT_NS,
        element: 'file',
        fields: {
            name: Utils.textSub(FT_NS, 'name'),
            desc: Utils.textSub(FT_NS, 'desc'),
            size: Utils.numberSub(FT_NS, 'size'),
            date: Utils.dateSub(FT_NS, 'date')
        }
    });

    const Range = JXT.define({
        name: 'range',
        namespace: FT_NS,
        element: 'range',
        fields: {
            offset: Utils.numberAttribute('offset')
        }
    });

    const Thumbnail = JXT.define({
        name: 'thumbnail',
        namespace: NS.THUMBS_0,
        element: 'thumbnail',
        fields: {
            cid: Utils.attribute('cid'),
            mimeType: Utils.attribute('mime-type'),
            width: Utils.numberAttribute('width'),
            height: Utils.numberAttribute('height')
        }
    });

    const FileTransfer = JXT.define({
        name: '_filetransfer',
        namespace: FT_NS,
        element: 'description',
        tags: [ 'jingle-application' ],
        fields: {
            applicationType: { value: 'filetransfer' },
            offer: Utils.subExtension('offer', FT_NS, 'offer', File),
            request: Utils.subExtension('request', FT_NS, 'request', File)
        }
    });

    JXT.extend(File, Range);
    JXT.extend(File, Thumbnail);

    JXT.withDefinition('hash', NS.HASHES_1, function (Hash) {

        JXT.extend(File, Hash, 'hashes');
    });

    JXT.withDefinition('content', NS.JINGLE_1, function (Content) {

        JXT.extend(Content, FileTransfer);
    });
}
