'use strict';

var stanza = require('jxt');
var Iq = require('./iq');
var DataForm = require('./dataforms').DataForm;


var NS = 'http://jabber.org/protocol/pubsub#owner';


exports.PubsubOwner = stanza.define({
    name: 'pubsubOwner',
    namespace: NS,
    element: 'pubsub',
    fields: {
        create: stanza.subAttribute(NS, 'create', 'node'),
        purge: stanza.subAttribute(NS, 'purge', 'node'),
        del: stanza.subAttribute(NS, 'delete', 'node'),
        redirect: {
            get: function () {
                var del = stanza.find(this.xml, this._NS, 'delete');
                if (del.length) {
                    return stanza.getSubAttribute(del[0], this._NS, 'redirect', 'uri');
                }
                return '';
            },
            set: function (value) {
                var del = stanza.findOrCreate(this.xml, this._NS, 'delete');
                stanza.setSubAttribute(del, this._NS, 'redirect', 'uri', value);
            }
        }
    }
});

exports.Configure = stanza.define({
    name: 'config',
    namespace: NS,
    element: 'configure',
    fields: {
        node: stanza.attribute('node')
    }
});


stanza.extend(exports.Configure, DataForm);
stanza.extend(exports.PubsubOwner, exports.Configure);

stanza.extend(Iq, exports.PubsubOwner);
