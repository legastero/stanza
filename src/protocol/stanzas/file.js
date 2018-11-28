import * as NS from '../namespaces';

const FT_NS = NS.FILE_TRANSFER_4;

export default function(JXT) {
    const Utils = JXT.utils;

    const File = JXT.define({
        element: 'file',
        fields: {
            date: Utils.dateSub(FT_NS, 'date'),
            description: Utils.textSub(FT_NS, 'desc'),
            mediaType: Utils.textSub(FT_NS, 'media-type'),
            name: Utils.textSub(FT_NS, 'name'),
            size: Utils.numberSub(FT_NS, 'size')
        },
        name: 'file',
        namespace: FT_NS
    });

    const Range = JXT.define({
        element: 'range',
        fields: {
            length: Utils.numberAttribute('length'),
            offset: Utils.numberAttribute('offset')
        },
        name: 'range',
        namespace: FT_NS
    });

    const FileTransfer = JXT.define({
        element: 'description',
        fields: {
            applicationType: {
                value: FT_NS,
                writable: true
            }
        },
        name: '_' + FT_NS,
        namespace: FT_NS,
        tags: ['jingle-application']
    });

    const Received = JXT.define({
        element: 'received',
        fields: {
            creator: Utils.attribute('creator'),
            infoType: {
                value: '{' + FT_NS + '}received'
            },
            name: Utils.attribute('name')
        },
        name: '_{' + FT_NS + '}received',
        namespace: FT_NS,
        tags: ['jingle-info']
    });

    const Checksum = JXT.define({
        element: 'checksum',
        fields: {
            creator: Utils.attribute('creator'),
            infoType: {
                value: '{' + FT_NS + '}checksum'
            },
            name: Utils.attribute('name')
        },
        name: '_{' + FT_NS + '}checksum',
        namespace: FT_NS,
        tags: ['jingle-info']
    });

    JXT.extend(File, Range);
    JXT.extend(Checksum, File);
    JXT.extend(FileTransfer, File);

    JXT.withDefinition('hash', NS.HASHES_1, function(Hash) {
        JXT.extend(File, Hash, 'hashes');
        JXT.extend(Range, Hash, 'hashes');
    });

    JXT.withDefinition('content', NS.JINGLE_1, function(Content) {
        JXT.extend(Content, FileTransfer);
    });

    JXT.withDefinition('jingle', NS.JINGLE_1, function(Jingle) {
        JXT.extend(Jingle, Received);
        JXT.extend(Jingle, Checksum);
    });
}
