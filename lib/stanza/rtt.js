var stanza = require('jxt');

var Message = require('./message');

var NS = 'urn:xmpp:rtt:0';

var typemap = {
    'insert': 't',
    'erase': 'e',
    'wait': 'w',
};

var actionmap = {
    't': 'insert',
    'e': 'erase',
    'w': 'wait'
};


var RTT = module.exports = stanza.define({
    name: 'rtt',
    namespace: NS,
    element: 'rtt',
    fields: {
        id: stanza.attribute('id'),
        event: stanza.attribute('event', 'edit'),
        seq: stanza.numberAttribute('seq'),
        actions: {
            get: function () {
                var results = [];
                for(var i = 0, len = this.xml.childNodes.length; i < len; i++) {
                    var child = this.xml.childNodes[i];
                    var name = child.localName;
                    var action = {};

                    if (child.namespaceURI !== NS) {
                        continue;
                    }

                    if (actionmap[name]) {
                        action.type = actionmap[name];
                    } else {
                        continue;
                    }

                    var pos = stanza.getAttribute(child, 'p');
                    if (pos) {
                        action.pos = parseInt(pos, 10);
                    }

                    var n = stanza.getAttribute(child, 'n');
                    if (n) {
                        action.num = parseInt(n, 10);
                    }

                    var t = stanza.getText(child);
                    if (t && name === 't') {
                        action.text = t;
                    }


                    results.push(action);
                }

                return results;
            },
            set: function (actions) {
                var self = this;

                for (var i = 0, len = this.xml.childNodes.length; i < len; i++) {
                    this.xml.removeChild(this.xml.childNodes[i]);
                }

                actions.forEach(function (action ) {
                    if (!typemap[action.type]) {
                        return;
                    }

                    var child = stanza.createElement(NS, typemap[action.type], NS);

                    if (action.pos) {
                        stanza.setAttribute(child, 'p', action.pos.toString());
                    }

                    if (action.num) {
                        stanza.setAttribute(child, 'n', action.num.toString());
                    }

                    if (action.text) {
                        stanza.setText(child, action.text);
                    }

                    self.xml.appendChild(child);
                });
            }
        }
    }
});


stanza.extend(Message, RTT);
