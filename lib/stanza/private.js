'use strict';


module.exports = function (stanza) {
    var PrivateStorage = stanza.define({
        name: 'privateStorage',
        namespace: 'jabber:iq:private',
        element: 'query'
    });

    stanza.withIq(function (Iq) {
        stanza.extend(Iq, PrivateStorage);
    });
};

