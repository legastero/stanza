'use strict';

var NS = 'jabber:iq:version';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Version = stanza.define({
        name: 'version',
        namespace: NS,
        element: 'query',
        fields: {
            name: types.textSub(NS, 'name'),
            version: types.textSub(NS, 'version'),
            os: types.textSub(NS, 'os')
        }
    });
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Version);
    });
};
