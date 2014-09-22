'use strict';


module.exports = function (stanza) {
    var EntityTime = stanza.define({
        name: 'time',
        namespace: 'urn:xmpp:time',
        element: 'time',
        fields: {
            utc: stanza.utils.dateSub('urn:xmpp:time', 'utc'),
            tzo: stanza.utils.tzoSub('urn:xmpp:time', 'tzo', 0)
        }
    });
    
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, EntityTime);
    });
};
