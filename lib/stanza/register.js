'use strict';

var NS = 'jabber:iq:register';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Register = stanza.define({
        name: 'register',
        namespace: NS,
        element: 'query',
        fields: {
            instructions: types.textSub(NS, 'instructions'),
            registered: types.boolSub(NS, 'registered'),
            remove: types.boolSub(NS, 'remove'),
            username: types.textSub(NS, 'username'),
            nick: types.textSub(NS, 'nick'),
            password: types.textSub(NS, 'password'),
            name: types.textSub(NS, 'name'),
            first: types.textSub(NS, 'first'),
            last: types.textSub(NS, 'last'),
            email: types.textSub(NS, 'email'),
            address: types.textSub(NS, 'address'),
            city: types.textSub(NS, 'city'),
            state: types.textSub(NS, 'state'),
            zip: types.textSub(NS, 'zip'),
            phone: types.textSub(NS, 'phone'),
            url: types.textSub(NS, 'url'),
            date: types.textSub(NS, 'date'),
            misc: types.textSub(NS, 'misc'),
            text: types.textSub(NS, 'text'),
            key: types.textSub(NS, 'key')
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
