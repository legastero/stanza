var stanza = require('jxt');
var Iq = require('./iq');
var DataForm = require('./dataforms').DataForm;

var NS = 'urn:xmpp:extdisco:1';


var Services = exports.Services = stanza.define({
    name: 'services',
    namespace: NS,
    element: 'services',
    fields: {
        type: stanza.attribute('type')
    }
});

var Credentials = exports.Credentials = stanza.define({
    name: 'credentials',
    namespace: NS,
    element: 'credentials'
});

var Service = stanza.define({
    name: 'service',
    namespace: NS,
    element: 'service',
    fields: {
        host: stanza.attribute('host'),
        port: stanza.attribute('port'),
        transport: stanza.attribute('transport'),
        type: stanza.attribute('type'),
        username: stanza.attribute('username'),
        password: stanza.attribute('password')
    }
});


stanza.extend(Services, Service, 'services');
stanza.extend(Credentials, Service);
stanza.extend(Service, DataForm);

stanza.extend(Iq, Services);
stanza.extend(Iq, Credentials);
