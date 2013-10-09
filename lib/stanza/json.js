var stanza = require('jxt');
var Message = require('./message');
var Item = require('./pubsub').Item;
var EventItem = require('./pubsub').EventItem;


var JSONExtension = module.exports = {
    get: function () {
        var data = stanza.getSubText(this.xml, 'urn:xmpp:json:tmp', 'json');
        if (data) {
            return JSON.parse(data);
        }
    },
    set: function (value) {
        value = JSON.stringify(value);
        if (value) {
            stanza.setSubText(this.xml, 'urn:xmpp:json:tmp', 'json', value);
        }
    }
};


stanza.add(Message, 'json', JSONExtension);
stanza.add(Item, 'json', JSONExtension);
stanza.add(EventItem, 'json', JSONExtension);
