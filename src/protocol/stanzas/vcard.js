import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const VCardTemp = JXT.define({
        element: 'vCard',
        fields: {
            birthday: Utils.dateSub(NS.VCARD_TEMP, 'BDAY'),
            description: Utils.textSub(NS.VCARD_TEMP, 'DESC'),
            fullName: Utils.textSub(NS.VCARD_TEMP, 'FN'),
            jids: Utils.multiTextSub(NS.VCARD_TEMP, 'JABBERID'),
            nicknames: Utils.multiTextSub(NS.VCARD_TEMP, 'NICKNAME'),
            role: Utils.textSub(NS.VCARD_TEMP, 'ROLE'),
            title: Utils.textSub(NS.VCARD_TEMP, 'TITLE'),
            website: Utils.textSub(NS.VCARD_TEMP, 'URL')
        },
        name: 'vCardTemp',
        namespace: NS.VCARD_TEMP
    });

    const Email = JXT.define({
        element: 'EMAIL',
        fields: {
            email: Utils.textSub(NS.VCARD_TEMP, 'USERID'),
            home: Utils.boolSub(NS.VCARD_TEMP, 'HOME'),
            preferred: Utils.boolSub(NS.VCARD_TEMP, 'PREF'),
            work: Utils.boolSub(NS.VCARD_TEMP, 'WORK')
        },
        name: '_email',
        namespace: NS.VCARD_TEMP
    });

    const PhoneNumber = JXT.define({
        element: 'TEL',
        fields: {
            home: Utils.boolSub(NS.VCARD_TEMP, 'HOME'),
            mobile: Utils.boolSub(NS.VCARD_TEMP, 'CELL'),
            number: Utils.textSub(NS.VCARD_TEMP, 'NUMBER'),
            preferred: Utils.boolSub(NS.VCARD_TEMP, 'PREF'),
            work: Utils.boolSub(NS.VCARD_TEMP, 'WORK')
        },
        name: '_tel',
        namespace: NS.VCARD_TEMP
    });

    const Address = JXT.define({
        element: 'ADR',
        fields: {
            city: Utils.textSub(NS.VCARD_TEMP, 'LOCALITY'),
            country: Utils.textSub(NS.VCARD_TEMP, 'CTRY'),
            home: Utils.boolSub(NS.VCARD_TEMP, 'HOME'),
            pobox: Utils.textSub(NS.VCARD_TEMP, 'POBOX'),
            postalCode: Utils.textSub(NS.VCARD_TEMP, 'PCODE'),
            preferred: Utils.boolSub(NS.VCARD_TEMP, 'PREF'),
            region: Utils.textSub(NS.VCARD_TEMP, 'REGION'),
            street: Utils.textSub(NS.VCARD_TEMP, 'STREET'),
            street2: Utils.textSub(NS.VCARD_TEMP, 'EXTADD'),
            work: Utils.boolSub(NS.VCARD_TEMP, 'WORK')
        },
        name: '_address',
        namespace: NS.VCARD_TEMP
    });

    const Organization = JXT.define({
        element: 'ORG',
        fields: {
            name: Utils.textSub(NS.VCARD_TEMP, 'ORGNAME'),
            unit: Utils.textSub(NS.VCARD_TEMP, 'ORGUNIT')
        },
        name: 'organization',
        namespace: NS.VCARD_TEMP
    });

    const Name = JXT.define({
        element: 'N',
        fields: {
            family: Utils.textSub(NS.VCARD_TEMP, 'FAMILY'),
            given: Utils.textSub(NS.VCARD_TEMP, 'GIVEN'),
            middle: Utils.textSub(NS.VCARD_TEMP, 'MIDDLE'),
            prefix: Utils.textSub(NS.VCARD_TEMP, 'PREFIX'),
            suffix: Utils.textSub(NS.VCARD_TEMP, 'SUFFIX')
        },
        name: 'name',
        namespace: NS.VCARD_TEMP
    });

    const Photo = JXT.define({
        element: 'PHOTO',
        fields: {
            data: Utils.textSub(NS.VCARD_TEMP, 'BINVAL'),
            type: Utils.textSub(NS.VCARD_TEMP, 'TYPE'),
            url: Utils.textSub(NS.VCARD_TEMP, 'EXTVAL')
        },
        name: 'photo',
        namespace: NS.VCARD_TEMP
    });

    JXT.extend(VCardTemp, Email, 'emails');
    JXT.extend(VCardTemp, Address, 'addresses');
    JXT.extend(VCardTemp, PhoneNumber, 'phoneNumbers');
    JXT.extend(VCardTemp, Organization);
    JXT.extend(VCardTemp, Name);
    JXT.extend(VCardTemp, Photo);

    JXT.extendIQ(VCardTemp);
}
