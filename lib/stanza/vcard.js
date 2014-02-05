"use strict";

var stanza = require('jxt');
var Iq = require('./iq');
var NS = 'vcard-temp';


var VCardTemp = module.exports = stanza.define({
    name: 'vCardTemp',
    namespace: NS,
    element: 'vCard',
    fields: {
        role: stanza.subText(NS, 'ROLE'),
        website: stanza.subText(NS, 'URL'),
        title: stanza.subText(NS, 'TITLE'),
        description: stanza.subText(NS, 'DESC'),
        fullName: stanza.subText(NS, 'FN'),
        birthday: stanza.dateSub(NS, 'BDAY'),
        nicknames: stanza.multiSubText(NS, 'NICKNAME'),
        jids: stanza.multiSubText(NS, 'JABBERID')
    }
});

var Email = stanza.define({
    name: '_email',
    namespace: NS,
    element: 'EMAIL',
    fields: {
        email: stanza.subText(NS, 'USERID'),
        home: stanza.boolSub(NS, 'HOME'),
        work: stanza.boolSub(NS, 'WORK'),
        preferred: stanza.boolSub(NS, 'PREF')
    }
});

var PhoneNumber = stanza.define({
    name: '_tel',
    namespace: NS,
    element: 'TEL',
    fields: {
        number: stanza.subText(NS, 'NUMBER'),
        home: stanza.boolSub(NS, 'HOME'),
        work: stanza.boolSub(NS, 'WORK'),
        mobile: stanza.boolSub(NS, 'CELL'),
        preferred: stanza.boolSub(NS, 'PREF')
    }
});

var Address = stanza.define({
    name: '_address',
    namespace: NS,
    element: 'ADR',
    fields: {
        street: stanza.subText(NS, 'STREET'),
        street2: stanza.subText(NS, 'EXTADD'),
        country: stanza.subText(NS, 'CTRY'),
        city: stanza.subText(NS, 'LOCALITY'),
        region: stanza.subText(NS, 'REGION'),
        postalCode: stanza.subText(NS, 'PCODE'),
        pobox: stanza.subText(NS, 'POBOX'),
        home: stanza.boolSub(NS, 'HOME'),
        work: stanza.boolSub(NS, 'WORK'),
        preferred: stanza.boolSub(NS, 'PREF')
    }
});

var Organization = stanza.define({
    name: 'organization',
    namespace: NS,
    element: 'ORG',
    fields: {
        name: stanza.subText(NS, 'ORGNAME'),
        unit: stanza.subText(NS, 'ORGUNIT')
    }
});

var Name = stanza.define({
    name: 'name',
    namespace: NS,
    element: 'N',
    fields: {
        family: stanza.subText(NS, 'FAMILY'),
        given: stanza.subText(NS, 'GIVEN'),
        middle: stanza.subText(NS, 'MIDDLE'),
        prefix: stanza.subText(NS, 'PREFIX'),
        suffix: stanza.subText(NS, 'SUFFIX')
    }
});

var Photo = stanza.define({
    name: 'photo',
    namespace: NS,
    element: 'PHOTO',
    fields: {
        type: stanza.subText(NS, 'TYPE'),
        data: stanza.subText(NS, 'BINVAL'),
        url: stanza.subText(NS, 'EXTVAL')
    }
});


stanza.extend(VCardTemp, Email, 'emails');
stanza.extend(VCardTemp, Address, 'addresses');
stanza.extend(VCardTemp, PhoneNumber, 'phoneNumbers');
stanza.extend(VCardTemp, Organization);
stanza.extend(VCardTemp, Name);
stanza.extend(VCardTemp, Photo);
stanza.extend(Iq, VCardTemp);
