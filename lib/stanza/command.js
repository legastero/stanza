'use strict';

var NS = 'http://jabber.org/protocol/commands';
var ACTIONS = ['next', 'prev', 'complete', 'cancel'];
var CONDITIONS = [
    'bad-action',
    'bad-locale',
    'bad-payload',
    'bad-sessionid',
    'malformed-action',
    'session-expired'
];


module.exports = function (stanza) {
    var types = stanza.utils;

    var Command = stanza.define({
        name: 'command',
        namespace: NS,
        element: 'command',
        fields: {
            action: types.attribute('action'),
            node: types.attribute('node'),
            sessionid: types.attribute('sessionid'),
            status: types.attribute('status'),
            execute: types.subAttribute(NS, 'actions', 'execute'),
            actions: {
                get: function () {
                    var result = [];
                    var actionSet = types.find(this.xml, NS, 'actions');
                    if (!actionSet.length) {
                        return [];
                    }
                    ACTIONS.forEach(function (action) {
                        var existing = types.find(actionSet[0], NS, action);
                        if (existing.length) {
                            result.push(action);
                        }
                    });
                    return result;
                },
                set: function (values) {
                    var actionSet = types.findOrCreate(this.xml, NS, 'actions');
                    for (var i = 0, len = actionSet.childNodes.length; i < len; i++) {
                        actionSet.removeChild(actionSet.childNodes[i]);
                    }
                    values.forEach(function (value) {
                        actionSet.appendChild(types.createElement(NS, value.toLowerCase(), NS));
                    });
                }
            }
        }
    });

    var Note = stanza.define({
        name: '_commandNote',
        namespace: NS,
        element: 'note',
        fields: {
            type: types.attribute('type'),
            value: types.text()
        }
    });


    stanza.extend(Command, Note, 'notes');
    
    stanza.withStanzaError(function (ErrorStanza) {
        stanza.add(ErrorStanza, 'adhocCommandCondition', types.enumSub(NS, CONDITIONS));
    });
    
    stanza.withDataForm(function (DataForm) {
        stanza.extend(Command, DataForm);
    });

    stanza.withIq(function (Iq) {
        stanza.extend(Iq, Command);
    });
};
