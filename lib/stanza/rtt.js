'use strict';

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


module.exports = function (stanza) {
    var types = stanza.utils;

    var RTT = stanza.define({
        name: 'rtt',
        namespace: NS,
        element: 'rtt',
        fields: {
            id: types.attribute('id'),
            event: types.attribute('event', 'edit'),
            seq: types.numberAttribute('seq'),
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
    
                        var pos = types.getAttribute(child, 'p');
                        if (pos) {
                            action.pos = parseInt(pos, 10);
                        }
    
                        var n = types.getAttribute(child, 'n');
                        if (n) {
                            action.num = parseInt(n, 10);
                        }
    
                        var t = types.getText(child);
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
    
                        var child = types.createElement(NS, typemap[action.type], NS);
    
                        if (action.pos !== undefined) {
                            types.setAttribute(child, 'p', action.pos.toString());
                        }
    
                        if (action.num) {
                            types.setAttribute(child, 'n', action.num.toString());
                        }
    
                        if (action.text) {
                            types.setText(child, action.text);
                        }
    
                        self.xml.appendChild(child);
                    });
                }
            }
        }
    });
    
    
    stanza.withMessage(function (Message) {
        stanza.extend(Message, RTT);
    });
};
