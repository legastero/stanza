'use strict';

var NS = 'vcard-temp';


module.exports = function (stanza) {
    var types = stanza.utils;

    var VCardTemp = stanza.define({
        name: 'vCardTemp',
        namespace: NS,
        element: 'vCard',
        fields: {
            role: types.subText(NS, 'ROLE'),
            website: types.subText(NS, 'URL'),
            title: types.subText(NS, 'TITLE'),
            description: types.subText(NS, 'DESC'),
            fullName: types.subText(NS, 'FN'),
            birthday: types.dateSub(NS, 'BDAY'),
            nicknames: types.multiSubText(NS, 'NICKNAME'),
            jids: types.multiSubText(NS, 'JABBERID')
        }
    });
    
    var Email = stanza.define({
        name: '_email',
        namespace: NS,
        element: 'EMAIL',
        fields: {
            email: types.subText(NS, 'USERID'),
            home: types.boolSub(NS, 'HOME'),
            work: types.boolSub(NS, 'WORK'),
            preferred: types.boolSub(NS, 'PREF')
        }
    });
    
    var PhoneNumber = stanza.define({
        name: '_tel',
        namespace: NS,
        element: 'TEL',
        fields: {
            number: types.subText(NS, 'NUMBER'),
            home: types.boolSub(NS, 'HOME'),
            work: types.boolSub(NS, 'WORK'),
            mobile: types.boolSub(NS, 'CELL'),
            preferred: types.boolSub(NS, 'PREF')
        }
    });
    
    var Address = stanza.define({
        name: '_address',
        namespace: NS,
        element: 'ADR',
        fields: {
            street: types.subText(NS, 'STREET'),
            street2: types.subText(NS, 'EXTADD'),
            country: types.subText(NS, 'CTRY'),
            city: types.subText(NS, 'LOCALITY'),
            region: types.subText(NS, 'REGION'),
            postalCode: types.subText(NS, 'PCODE'),
            pobox: types.subText(NS, 'POBOX'),
            home: types.boolSub(NS, 'HOME'),
            work: types.boolSub(NS, 'WORK'),
            preferred: types.boolSub(NS, 'PREF')
        }
    });
    
    var Organization = stanza.define({
        name: 'organization',
        namespace: NS,
        element: 'ORG',
        fields: {
            name: types.subText(NS, 'ORGNAME'),
            unit: types.subText(NS, 'ORGUNIT')
        }
    });
    
    var Name = stanza.define({
        name: 'name',
        namespace: NS,
        element: 'N',
        fields: {
            family: types.subText(NS, 'FAMILY'),
            given: types.subText(NS, 'GIVEN'),
            middle: types.subText(NS, 'MIDDLE'),
            prefix: types.subText(NS, 'PREFIX'),
            suffix: types.subText(NS, 'SUFFIX')
        }
    });
    
    var Photo = stanza.define({
        name: 'photo',
        namespace: NS,
        element: 'PHOTO',
        fields: {
            type: types.subText(NS, 'TYPE'),
            data: types.subText(NS, 'BINVAL'),
            url: types.subText(NS, 'EXTVAL')
        }
    });
    
    
    stanza.extend(VCardTemp, Email, 'emails');
    stanza.extend(VCardTemp, Address, 'addresses');
    stanza.extend(VCardTemp, PhoneNumber, 'phoneNumbers');
    stanza.extend(VCardTemp, Organization);
    stanza.extend(VCardTemp, Name);
    stanza.extend(VCardTemp, Photo);

    stanza.withIq(function (Iq) {
        stanza.extend(Iq, VCardTemp);
    });
};
