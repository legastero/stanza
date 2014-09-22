'use strict';

var NS = 'urn:xmpp:extdisco:1';


module.exports = function (stanza) {
    var types = stanza.utils;

    var Services = exports.Services = stanza.define({
        name: 'services',
        namespace: NS,
        element: 'services',
        fields: {
            type: types.attribute('type')
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
            host: types.attribute('host'),
            port: types.attribute('port'),
            transport: types.attribute('transport'),
            type: types.attribute('type'),
            username: types.attribute('username'),
            password: types.attribute('password')
        }
    });
    
    
    stanza.extend(Services, Service, 'services');
    stanza.extend(Credentials, Service);

    stanza.withDataForm(function (DataForm) {
        stanza.extend(Service, DataForm);
    });
    
    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Services);
        stanza.extend(Iq, Credentials);
    });
};
