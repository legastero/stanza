// ====================================================================
// XEP-0234: Jingle File Transfer
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0234.html
// Version: Version 0.18.3 (2017-08-24)
// ====================================================================

import { JINGLE_INFO_CHECKSUM_5, JINGLE_INFO_RECEIVED_5, JingleSessionRole } from '../Constants';
import {
    addAlias,
    attribute,
    childDate,
    childInteger,
    childText,
    DefinitionOptions,
    integerAttribute
} from '../jxt';
import {
    NS_HASHES_1,
    NS_HASHES_2,
    NS_JINGLE_FILE_TRANSFER_4,
    NS_JINGLE_FILE_TRANSFER_5,
    NS_THUMBS_1
} from '../Namespaces';

import { Hash, HashUsed, JingleApplication, JingleInfo, Thumbnail } from './';

export interface FileTransferDescription extends JingleApplication {
    applicationType: typeof NS_JINGLE_FILE_TRANSFER_5 | typeof NS_JINGLE_FILE_TRANSFER_4;
    file: FileDescription;
}

export interface FileDescription {
    name?: string;
    description?: string;
    mediaType?: string;
    size?: number;
    date?: Date;
    range?: FileRange;
    hashes?: Hash[];
    hashesUsed?: HashUsed[];
    thumbnails?: Thumbnail[];
}

export interface FileRange {
    offset?: number;
    length?: number;
}

export interface FileTransferInfo extends JingleInfo {
    infoType: typeof JINGLE_INFO_CHECKSUM_5 | typeof JINGLE_INFO_RECEIVED_5;
    creator?: JingleSessionRole;
    name: string;
    file?: FileDescription;
}

let Protocol: DefinitionOptions[] = [
    addAlias(NS_HASHES_2, 'hash', [
        { path: 'file.hashes', multiple: true },
        { path: 'file.range.hashes', multiple: true }
    ]),
    addAlias(NS_HASHES_1, 'hash', [
        { path: 'file.hashes', multiple: true },
        { path: 'file.range.hashes', multiple: true }
    ]),
    addAlias(NS_HASHES_2, 'hash-used', [{ path: 'file.hashesUsed', multiple: true }]),
    addAlias(NS_THUMBS_1, 'thumbnail', [{ path: 'file.thumbnails', multiple: true }])
];

for (const ftVersion of [NS_JINGLE_FILE_TRANSFER_4, NS_JINGLE_FILE_TRANSFER_5]) {
    Protocol = Protocol.concat([
        {
            aliases: [
                'file',
                {
                    impliedType: true,
                    path: 'iq.jingle.contents.application.file',
                    selector: ftVersion
                },
                {
                    impliedType: true,
                    path: 'iq.jingle.info.file',
                    selector: `{${ftVersion}}checksum`
                }
            ],
            defaultType: NS_JINGLE_FILE_TRANSFER_5,
            element: 'file',
            fields: {
                date: childDate(null, 'date'),
                description: childText(null, 'desc'),
                mediaType: childText(null, 'media-type'),
                name: childText(null, 'name'),
                size: childInteger(null, 'size')
            },
            namespace: ftVersion,
            type: ftVersion,
            typeField: 'version'
        },
        {
            aliases: [{ impliedType: true, path: 'file.range', selector: ftVersion }],
            defaultType: NS_JINGLE_FILE_TRANSFER_5,
            element: 'range',
            fields: {
                length: integerAttribute('length'),
                offset: integerAttribute('offset', 0)
            },
            namespace: ftVersion,
            type: ftVersion,
            typeField: 'version'
        },
        {
            element: 'description',
            namespace: ftVersion,
            path: 'iq.jingle.contents.application',
            type: ftVersion,
            typeField: 'applicationType'
        },
        {
            element: 'received',
            fields: {
                creator: attribute('creator'),
                name: attribute('name')
            },
            namespace: ftVersion,
            path: 'iq.jingle.info',
            type: `{${ftVersion}}received`,
            typeField: 'infoType'
        },
        {
            element: 'checksum',
            fields: {
                creator: attribute('creator'),
                name: attribute('name')
            },
            namespace: ftVersion,
            path: 'iq.jingle.info',
            type: `{${ftVersion}}checksum`,
            typeField: 'infoType'
        }
    ]);
}

export default Protocol;
