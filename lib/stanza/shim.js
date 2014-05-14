var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');


var NS = 'http://jabber.org/protocol/shim';


var SHIM = module.exports = {
    get: function () {
        var headerSet = stanza.find(this.xml, NS, 'headers');
        if (headerSet.length) {
            return stanza.getMultiSubText(headerSet[0], NS, 'header', function (header) {
                var name = stanza.getAttribute(header, 'name');
                if (name) {
                    return {
                        name: name,
                        value: stanza.getText(header)
                    };
                }
            });
        }
        return [];
    },
    set: function (values) {
        var headerSet = stanza.findOrCreate(this.xml, NS, 'headers');
        stanza.setMultiSubText(headerSet, NS, 'header', values, function (val) {
            var header = stanza.createElement(NS, 'header', NS);
            stanza.setAttribute(header, 'name', val.name);
            stanza.setText(header, val.value);
            headerSet.appendChild(header);
        });
    }
};


stanza.add(Message, 'headers', SHIM);
stanza.add(Presence, 'headers', SHIM);
