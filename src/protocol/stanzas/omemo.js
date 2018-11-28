import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const OMEMO = JXT.define({
        element: 'encrypted',
        fields: {
            payload: Utils.textSub(NS.OMEMO_AXOLOTL, 'payload')
        },
        name: 'omemo',
        namespace: NS.OMEMO_AXOLOTL
    });

    const Header = JXT.define({
        element: 'header',
        fields: {
            iv: Utils.textSub(NS.OMEMO_AXOLOTL, 'iv'),
            sid: Utils.attribute('sid')
        },
        name: 'header',
        namespace: NS.OMEMO_AXOLOTL
    });

    const Key = JXT.define({
        element: 'key',
        fields: {
            preKey: Utils.boolAttribute('prekey'),
            rid: Utils.attribute('rid'),
            value: Utils.text()
        },
        namespace: NS.OMEMO_AXOLOTL
    });

    const DeviceList = JXT.define({
        element: 'list',
        fields: {
            devices: Utils.multiSubAttribute(NS.OMEMO_AXOLOTL, 'device', 'id')
        },
        name: 'omemoDeviceList',
        namespace: NS.OMEMO_AXOLOTL
    });

    const PreKeyPublic = JXT.define({
        element: 'preKeyPublic',
        fields: {
            id: Utils.attribute('preKeyId'),
            value: Utils.text()
        },
        name: 'preKeyPublic',
        namespace: NS.OMEMO_AXOLOTL
    });

    const SignedPreKeyPublic = JXT.define({
        element: 'signedPreKeyPublic',
        fields: {
            id: Utils.attribute('signedPreKeyId'),
            value: Utils.text()
        },
        name: 'signedPreKeyPublic',
        namespace: NS.OMEMO_AXOLOTL
    });

    const Bundle = JXT.define({
        element: 'bundle',
        fields: {
            identityKey: Utils.textSub(NS.OMEMO_AXOLOTL, 'identityKey'),
            preKeys: Utils.subMultiExtension(NS.OMEMO_AXOLOTL, 'prekeys', PreKeyPublic),
            signedPreKeySignature: Utils.textSub(NS.OMEMO_AXOLOTL, 'signedPreKeySignature')
        },
        name: 'omemoDevice',
        namespace: NS.OMEMO_AXOLOTL
    });

    JXT.extend(Bundle, SignedPreKeyPublic);

    JXT.extend(Header, Key, 'keys', true);
    JXT.extend(OMEMO, Header);

    JXT.withMessage(function(Message) {
        JXT.extend(Message, OMEMO);
    });

    JXT.withPubsubItem(function(Item) {
        JXT.extend(Item, Bundle);
        JXT.extend(Item, DeviceList);
    });
}
