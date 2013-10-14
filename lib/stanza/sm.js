var stanza = require('jxt');
var util = require('./util');
var StreamFeatures = require('./streamFeatures');


var NS = 'urn:xmpp:sm:3';


exports.SMFeature = stanza.define({
    name: 'streamManagement',
    namespace: NS,
    element: 'sm'
});

exports.Enable = stanza.define({
    name: 'smEnable',
    eventName: 'stream:management:enable',
    namespace: NS,
    element: 'enable',
    topLevel: true,
    fields: {
        resume: stanza.boolAttribute('resume')
    }
});

exports.Enabled = stanza.define({
    name: 'smEnabled',
    eventName: 'stream:management:enabled',
    namespace: NS,
    element: 'enabled',
    topLevel: true,
    fields: {
        id: stanza.attribute('id'),
        resume: stanza.boolAttribute('resume')
    }
});

exports.Resume = stanza.define({
    name: 'smResume',
    eventName: 'stream:management:resume',
    namespace: NS,
    element: 'resume',
    topLevel: true,
    fields: {
        h: util.numberAttribute('h'),
        previd: stanza.attribute('previd')
    }
});

exports.Resumed = stanza.define({
    name: 'smResumed',
    eventName: 'stream:management:resumed',
    namespace: NS,
    element: 'resumed',
    topLevel: true,
    fields: {
        h: util.numberAttribute('h'),
        previd: stanza.attribute('previd')
    }
});

exports.Failed = stanza.define({
    name: 'smFailed',
    eventName: 'stream:management:failed',
    namespace: NS,
    element: 'failed',
    topLevel: true
});

exports.Ack = stanza.define({
    name: 'smAck',
    eventName: 'stream:management:ack',
    namespace: NS,
    element: 'a',
    topLevel: true,
    fields: {
        h: util.numberAttribute('h')
    }
});

exports.Request = stanza.define({
    name: 'smRequest',
    eventName: 'stream:management:request',
    namespace: NS,
    element: 'r',
    topLevel: true
});


stanza.extend(StreamFeatures, exports.SMFeature);
