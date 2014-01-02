"use strict";

var stanza = require('jxt');
var Iq = require('./iq');
var NS = 'vcard-temp';

var VCardTemp = module.exports = stanza.define({
    name: 'vCardTemp',
    namespace: NS,
    element: 'vCard',
    fields: {
        fullName: stanza.subText(NS, 'FN'),
        birthday: stanza.dateSub(NS, 'BDAY'),
        nicknames: stanza.multiSubText(NS, 'NICKNAME')
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

stanza.extend(VCardTemp, Name);
stanza.extend(VCardTemp, Photo);
stanza.extend(Iq, VCardTemp);
