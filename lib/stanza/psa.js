"use strict";

var stanza = require('jxt');
var util = require('./util');
var Presence = require('./presence');

var NS = 'urn:xmpp:psa';
var CONDITIONS = [
    'server-unavailable', 'connection-paused'
];


var PSA = module.exports = stanza.define({
    name: 'state',
    namespace: NS,
    element: 'state-annotation',
    fields: {
        from: util.jidAttribute('from'),
        condition: {
            get: function () {
                var self = this;
                var result = [];
                CONDITIONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, NS, condition);
                    if (exists.length) {
                        result.push(exists[0].tagName);
                    }
                });
                return result[0] || '';
            },
            set: function (value) {
                var self = this;
                CONDITIONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, NS, condition);
                    if (exists.length) {
                        self.xml.removeChild(exists[0]);
                    }
                });
                if (value) {
                    var condition = stanza.createElement(NS, value, NS);
                    self.xml.appendChild(condition);
                }
            }
        },
        description: stanza.subText(NS, 'description')
    }
});


stanza.extend(Presence, PSA);
