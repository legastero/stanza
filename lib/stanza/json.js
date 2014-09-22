'use strict';


module.exports = function (stanza) {
    var types = stanza.utils;

    var JSONExtension = {
        get: function () {
            var data = types.getSubText(this.xml, 'urn:xmpp:json:0', 'json');
            if (data) {
                return JSON.parse(data);
            }
        },
        set: function (value) {
            value = JSON.stringify(value);
            if (value) {
                types.setSubText(this.xml, 'urn:xmpp:json:0', 'json', value);
            }
        }
    };
    
    
    stanza.withMessage(function (Message) {
        stanza.add(Message, 'json', JSONExtension);
    });

    stanza.withPubsubItem(function (Item) {
        stanza.add(Item, 'json', JSONExtension);
    });
};
