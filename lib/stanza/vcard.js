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
        phone_numbers: stanza.multiSubText(NS, 'TEL'),
        website: stanza.subText(NS, 'URL'),
        title: stanza.subText(NS, 'TITLE'),
        description: stanza.subText(NS, 'DESC'),
        emails: stanza.multiSubText(NS, 'EMAIL'),
        fullName: stanza.subText(NS, 'FN'),
        birthday: stanza.dateSub(NS, 'BDAY'),
        nicknames: stanza.multiSubText(NS, 'NICKNAME')
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

stanza.extend(VCardTemp, Organization);
stanza.extend(VCardTemp, Name);
stanza.extend(VCardTemp, Photo);
stanza.extend(Iq, VCardTemp);
