'use strict';

var NS = 'jabber:iq:version';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Version = stanza.define({
        name: 'version',
        namespace: NS,
        element: 'query',
        fields: {
            name: types.subText(NS, 'name'),
            version: types.subText(NS, 'version'),
            os: types.subText(NS, 'os')
        }
    });
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Version);
    });
};
