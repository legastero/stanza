'use strict';

var NS = 'urn:xmpp:sm:3';


module.exports = function (stanza) {
    var types = stanza.utils;

    var SMFeature = stanza.define({
        name: 'streamManagement',
        namespace: NS,
        element: 'sm'
    });

    stanza.define({
        name: 'smEnable',
        eventName: 'stream:management:enable',
        namespace: NS,
        element: 'enable',
        topLevel: true,
        fields: {
            resume: types.boolAttribute('resume')
        }
    });

    stanza.define({
        name: 'smEnabled',
        eventName: 'stream:management:enabled',
        namespace: NS,
        element: 'enabled',
        topLevel: true,
        fields: {
            id: types.attribute('id'),
            resume: types.boolAttribute('resume')
        }
    });

    stanza.define({
        name: 'smResume',
        eventName: 'stream:management:resume',
        namespace: NS,
        element: 'resume',
        topLevel: true,
        fields: {
            h: types.numberAttribute('h', false, 0),
            previd: types.attribute('previd')
        }
    });

    stanza.define({
        name: 'smResumed',
        eventName: 'stream:management:resumed',
        namespace: NS,
        element: 'resumed',
        topLevel: true,
        fields: {
            h: types.numberAttribute('h', false, 0),
            previd: types.attribute('previd')
        }
    });

    stanza.define({
        name: 'smFailed',
        eventName: 'stream:management:failed',
        namespace: NS,
        element: 'failed',
        topLevel: true
    });

    stanza.define({
        name: 'smAck',
        eventName: 'stream:management:ack',
        namespace: NS,
        element: 'a',
        topLevel: true,
        fields: {
            h: types.numberAttribute('h', false, 0)
        }
    });

    stanza.define({
        name: 'smRequest',
        eventName: 'stream:management:request',
        namespace: NS,
        element: 'r',
        topLevel: true
    });
    
    
    stanza.withStreamFeatures(function (StreamFeatures) {
        stanza.extend(StreamFeatures, SMFeature);
    });
};
