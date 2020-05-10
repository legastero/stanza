// ====================================================================
// XEP-0153: vCard-Based Avatars
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0153.html
// Version: 1.1 (2018-02-26)
// ====================================================================

import { extendPresence, findAll, findOrCreate } from '../jxt';
import { NS_VCARD_TEMP_UPDATE } from '../Namespaces';

declare module './' {
    export interface Presence {
        vcardAvatar?: string | boolean;
    }
}

export default extendPresence({
    vcardAvatar: {
        importer(xml) {
            const update = findAll(xml, NS_VCARD_TEMP_UPDATE, 'x');
            if (!update.length) {
                return;
            }
            const photo = findAll(update[0], NS_VCARD_TEMP_UPDATE, 'photo');
            if (photo.length) {
                return photo[0].getText();
            } else {
                return true;
            }
        },
        exporter(xml, value) {
            const update = findOrCreate(xml, NS_VCARD_TEMP_UPDATE, 'x');

            if (value === '') {
                findOrCreate(update, NS_VCARD_TEMP_UPDATE, 'photo');
            } else if (value === true) {
                return;
            } else if (value) {
                const photo = findOrCreate(update, NS_VCARD_TEMP_UPDATE, 'photo');
                photo.children.push(value);
            }
        }
    }
});
