var stanza = require('jxt');

var Iq = require('./iq');
var DataForm = require('./dataforms').DataForm;
var OOB = require('./oob');

var NS = 'jabber:iq:register';


var Register = module.exports = stanza.define({
    name: 'register',
    namespace: NS,
    element: 'query',
    fields: {
        instructions: stanza.subText(NS, 'instructions'),
        registered: stanza.boolSub(NS, 'registered'),
        remove: stanza.boolSub(NS, 'remove'),
        username: stanza.subText(NS, 'username'),
        nick: stanza.subText(NS, 'nick'),
        password: stanza.subText(NS, 'password'),
        name: stanza.subText(NS, 'name'),
        first: stanza.subText(NS, 'first'),
        last: stanza.subText(NS, 'last'),
        email: stanza.subText(NS, 'email'),
        address: stanza.subText(NS, 'address'),
        city: stanza.subText(NS, 'city'),
        state: stanza.subText(NS, 'state'),
        zip: stanza.subText(NS, 'zip'),
        phone: stanza.subText(NS, 'phone'),
        url: stanza.subText(NS, 'url'),
        date: stanza.subText(NS, 'date'),
        misc: stanza.subText(NS, 'misc'),
        text: stanza.subText(NS, 'text'),
        key: stanza.subText(NS, 'key')
    }
});


stanza.extend(Iq, Register);
stanza.extend(Register, DataForm);
stanza.extend(Register, OOB);
