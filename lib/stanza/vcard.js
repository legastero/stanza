'use strict';

var NS = 'vcard-temp';


module.exports = function (stanza) {
    var types = stanza.utils;

    var VCardTemp = stanza.define({
        name: 'vCardTemp',
        namespace: NS,
        element: 'vCard',
        fields: {
            role: types.textSub(NS, 'ROLE'),
            website: types.textSub(NS, 'URL'),
            title: types.textSub(NS, 'TITLE'),
            description: types.textSub(NS, 'DESC'),
            fullName: types.textSub(NS, 'FN'),
            birthday: types.dateSub(NS, 'BDAY'),
            nicknames: types.multiTextSub(NS, 'NICKNAME'),
            jids: types.multiTextSub(NS, 'JABBERID')
        }
    });
    
    var Email = stanza.define({
        name: '_email',
        namespace: NS,
        element: 'EMAIL',
        fields: {
            email: types.textSub(NS, 'USERID'),
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
            number: types.textSub(NS, 'NUMBER'),
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
            street: types.textSub(NS, 'STREET'),
            street2: types.textSub(NS, 'EXTADD'),
            country: types.textSub(NS, 'CTRY'),
            city: types.textSub(NS, 'LOCALITY'),
            region: types.textSub(NS, 'REGION'),
            postalCode: types.textSub(NS, 'PCODE'),
            pobox: types.textSub(NS, 'POBOX'),
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
            name: types.textSub(NS, 'ORGNAME'),
            unit: types.textSub(NS, 'ORGUNIT')
        }
    });
    
    var Name = stanza.define({
        name: 'name',
        namespace: NS,
        element: 'N',
        fields: {
            family: types.textSub(NS, 'FAMILY'),
            given: types.textSub(NS, 'GIVEN'),
            middle: types.textSub(NS, 'MIDDLE'),
            prefix: types.textSub(NS, 'PREFIX'),
            suffix: types.textSub(NS, 'SUFFIX')
        }
    });
    
    var Photo = stanza.define({
        name: 'photo',
        namespace: NS,
        element: 'PHOTO',
        fields: {
            type: types.textSub(NS, 'TYPE'),
            data: types.textSub(NS, 'BINVAL'),
            url: types.textSub(NS, 'EXTVAL')
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
