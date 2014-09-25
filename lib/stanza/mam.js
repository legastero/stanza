'use strict';

var JID = require('xmpp-jid').JID;
var NS = 'urn:xmpp:mam:0';


module.exports = function (stanza) {
    var types = stanza.utils;

    var MAMQuery = stanza.define({
        name: 'mam',
        namespace: NS,
        element: 'query',
        fields: {
            queryid: types.attribute('queryid')
        }
    });
    
    var Result = stanza.define({
        name: 'mamItem',
        namespace: NS,
        element: 'result',
        fields: {
            queryid: types.attribute('queryid'),
            id: types.attribute('id')
        }
    });

    var Fin = stanza.define({
        name: 'mamResult',
        namespace: NS,
        element: 'fin',
        fields: {
            queryid: types.attribute('queryid'),
            complete: types.boolAttribute('complete'),
            stable: types.boolAttribute('stable')
        }
    });
    
    var Prefs = stanza.define({
        name: 'mamPrefs',
        namespace: NS,
        element: 'prefs',
        fields: {
            defaultCondition: types.attribute('default'),
            always: {
                get: function () {
                    var results = [];
                    var container = types.find(this.xml, NS, 'always');
                    if (container.length === 0) {
                        return results;
                    }
                    container = container[0];
                    var jids = types.getMultiSubText(container, NS, 'jid');
                    jids.forEach(function (jid) {
                        results.push(new JID(jid.textContent));
                    });
                    return results;
                },
                set: function (value) {
                    if (value.length > 0) {
                        var container = types.find(this.xml, NS, 'always');
                        types.setMultiSubText(container, NS, 'jid', value);
                    }
                }
            },
            never: {
                get: function () {
                    var results = [];
                    var container = types.find(this.xml, NS, 'always');
                    if (container.length === 0) {
                        return results;
                    }
                    container = container[0];
                    var jids = types.getMultiSubText(container, NS, 'jid');
                    jids.forEach(function (jid) {
                        results.push(new JID(jid.textContent));
                    });
                    return results;
                },
                set: function (value) {
                    if (value.length > 0) {
                        var container = types.find(this.xml, NS, 'never');
                        types.setMultiSubText(container, NS, 'jid', value);
                    }
                }
            }
        }
    });
    

    stanza.withDefinition('forwarded', 'urn:xmpp:forward:0', function (Forwarded) {
        stanza.extend(Result, Forwarded);
    });

    stanza.withDefinition('set', 'http://jabber.org/protocol/rsm', function (RSM) {
        stanza.extend(MAMQuery, RSM);
        stanza.extend(Fin, RSM);
    });

    stanza.withDataForm(function (DataForm) {
        stanza.extend(MAMQuery, DataForm);
    });

    stanza.withIq(function (Iq) {
        stanza.extend(Iq, MAMQuery);
        stanza.extend(Iq, Prefs);
    });

    stanza.withMessage(function (Message) {
        stanza.extend(Message, Result);
        stanza.extend(Message, Fin);
    });
};
