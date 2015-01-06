'use strict';

var NS = 'jabber:x:oob';


module.exports = function (stanza) {
    var OOB = stanza.define({
        name: 'oob',
        element: 'x',
        namespace: NS,
        fields: {
            url: stanza.utils.textSub(NS, 'url'),
            desc: stanza.utils.textSub(NS, 'desc')
        }
    });
    
    stanza.withMessage(function (Message) {
        stanza.extend(Message, OOB, 'oobURIs');
    });
};
