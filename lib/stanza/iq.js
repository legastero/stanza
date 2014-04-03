"use strict";

var stanza = require('jxt');
var util = require('./util');


var Iq = module.exports = stanza.define({
    name: 'iq',
    namespace: 'jabber:client',
    element: 'iq',
    topLevel: true,
    fields: {
        lang: stanza.langAttribute(),
        id: stanza.attribute('id'),
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from'),
        type: stanza.attribute('type')
    }
});

Iq.prototype.resultReply = function (data) {
    data = data || {};
    data.to = this.from;
    data.id = this.id;
    data.type = 'result';
    return new Iq(data);
};

Iq.prototype.errorReply = function (data) {
    data = data || {};
    data.to = this.from;
    data.id = this.id;
    data.type = 'error';
    return new Iq(data);
};
