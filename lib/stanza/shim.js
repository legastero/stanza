'use strict';

var NS = 'http://jabber.org/protocol/shim';


module.exports = function (stanza) {
    var types = stanza.utils;

    var SHIM = {
        get: function () {
            var headerSet = types.find(this.xml, NS, 'headers');
            if (headerSet.length) {
                return types.getMultiSubText(headerSet[0], NS, 'header', function (header) {
                    var name = types.getAttribute(header, 'name');
                    if (name) {
                        return {
                            name: name,
                            value: types.getText(header)
                        };
                    }
                });
            }
            return [];
        },
        set: function (values) {
            var headerSet = types.findOrCreate(this.xml, NS, 'headers');
            stanza.setMultiSubText(headerSet, NS, 'header', values, function (val) {
                var header = types.createElement(NS, 'header', NS);
                types.setAttribute(header, 'name', val.name);
                types.setText(header, val.value);
                headerSet.appendChild(header);
            });
        }
    };
    
    
    stanza.withMessage(function (Message) {
        stanza.add(Message, 'headers', SHIM);
    });

    stanza.withPresence(function (Presence) {
        stanza.add(Presence, 'headers', SHIM);
    });
};
