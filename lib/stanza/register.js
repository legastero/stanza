'use strict';

var NS = 'jabber:iq:register';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Register = module.exports = stanza.define({
        name: 'register',
        namespace: NS,
        element: 'query',
        fields: {
            instructions: types.subText(NS, 'instructions'),
            registered: types.boolSub(NS, 'registered'),
            remove: types.boolSub(NS, 'remove'),
            username: types.subText(NS, 'username'),
            nick: types.subText(NS, 'nick'),
            password: types.subText(NS, 'password'),
            name: types.subText(NS, 'name'),
            first: types.subText(NS, 'first'),
            last: types.subText(NS, 'last'),
            email: types.subText(NS, 'email'),
            address: types.subText(NS, 'address'),
            city: types.subText(NS, 'city'),
            state: types.subText(NS, 'state'),
            zip: types.subText(NS, 'zip'),
            phone: types.subText(NS, 'phone'),
            url: types.subText(NS, 'url'),
            date: types.subText(NS, 'date'),
            misc: types.subText(NS, 'misc'),
            text: types.subText(NS, 'text'),
            key: types.subText(NS, 'key')
        }
    });
    

    stanza.withDefinition('x', 'jabber:x:oob', function (OOB) {
        stanza.extend(Register, OOB);
    });
    
    stanza.withDataForm(function (DataForm) {
        stanza.extend(Register, DataForm);
    });

    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Register);
    });
};
