import * as NS from '../namespaces';


export default function(JXT) {
    const Utils = JXT.utils;

    const OMEMO = JXT.define({
        name: 'omemo',
        element: 'encrypted',
        namespace: NS.OMEMO_AXOLOTL,
        fields: {
            payload: Utils.textSub(NS.OMEMO_AXOLOTL, 'payload')
        }
    });

    const Header = JXT.define({
        name: 'header',
        element: 'header',
        namespace: NS.OMEMO_AXOLOTL,
        fields: {
            iv: Utils.textSub(NS.OMEMO_AXOLOTL, 'iv'),
            sid: Utils.attribute('sid')
        }
    });

    const Key = JXT.define({
        element: 'key',
        namespace: NS.OMEMO_AXOLOTL,
        fields: {
            preKey: Utils.boolAttribute('prekey'),
            rid: Utils.attribute('rid'),
            value: Utils.text()
        }
    });


    const DeviceList = JXT.define({
        name: 'omemoDeviceList',
        element: 'list',
        namespace: NS.OMEMO_AXOLOTL,
        fields: {
            devices: Utils.multiSubAttribute(NS.OMEMO_AXOLOTL, 'device', 'id')
        }
    });


    const PreKeyPublic = JXT.define({
        name: 'preKeyPublic',
        element: 'preKeyPublic',
        namespace: NS.OMEMO_AXOLOTL,
        fields: {
            id: Utils.attribute('preKeyId'),
            value: Utils.text()
        }
    });

    const SignedPreKeyPublic = JXT.define({
        name: 'signedPreKeyPublic',
        element: 'signedPreKeyPublic',
        namespace: NS.OMEMO_AXOLOTL,
        fields: {
            id: Utils.attribute('signedPreKeyId'),
            value: Utils.text()
        }
    });

    const Bundle = JXT.define({
        name: 'omemoDevice',
        element: 'bundle',
        namespace: NS.OMEMO_AXOLOTL,
        fields: {
            identityKey: Utils.textSub(NS.OMEMO_AXOLOTL, 'identityKey'),
            preKeys: Utils.subMultiExtension(NS.OMEMO_AXOLOTL, 'prekeys', PreKeyPublic),
            signedPreKeySignature: Utils.textSub(NS.OMEMO_AXOLOTL, 'signedPreKeySignature')
        }
    });


    JXT.extend(Bundle, SignedPreKeyPublic);

    JXT.extend(Header, Key, 'keys', true);
    JXT.extend(OMEMO, Header);


    JXT.withMessage(function (Message) {
        JXT.extend(Message, OMEMO);
    });

    JXT.withPubsubItem(function (Item) {
        JXT.extend(Item, Bundle);
        JXT.extend(Item, DeviceList);
    });
}
