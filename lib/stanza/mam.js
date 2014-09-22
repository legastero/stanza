'use strict';

var JID = require('xmpp-jid').JID;


module.exports = function (stanza) {
    var types = stanza.utils;

    var MAMQuery = stanza.define({
        name: 'mamQuery',
        namespace: 'urn:xmpp:mam:tmp',
        element: 'query',
        fields: {
            queryid: types.attribute('queryid'),
            start: types.dateSub('urn:xmpp:mam:tmp', 'start'),
            end: types.dateSub('urn:xmpp:mam:tmp', 'end'),
            'with': types.jidSub('urn:xmpp:mam:tmp', 'with')
        }
    });
    
    var Result = stanza.define({
        name: 'mam',
        eventName: 'mam:result',
        namespace: 'urn:xmpp:mam:tmp',
        element: 'result',
        fields: {
            queryid: types.attribute('queryid'),
            id: types.attribute('id')
        }
    });
    
    var Archived = stanza.define({
        name: '_mamArchived',
        namespace: 'urn:xmpp:mam:tmp',
        element: 'archived',
        fields: {
            by: types.jidAttribute('by'),
            id: types.attribute('id')
        }
    });
    
    var Prefs = stanza.define({
        name: 'mamPrefs',
        namespace: 'urn:xmpp:mam:tmp',
        element: 'prefs',
        fields: {
            defaultCondition: types.attribute('default'),
            always: {
                get: function () {
                    var results = [];
                    var container = types.find(this.xml, this._NS, 'always');
                    if (container.length === 0) {
                        return results;
                    }
                    container = container[0];
                    var jids = types.getMultiSubText(container, this._NS, 'jid');
                    jids.forEach(function (jid) {
                        results.push(new JID(jid.textContent));
                    });
                    return results;
                },
                set: function (value) {
                    if (value.length > 0) {
                        var container = types.find(this.xml, this._NS, 'always');
                        types.setMultiSubText(container, this._NS, 'jid', value);
                    }
                }
            },
            never: {
                get: function () {
                    var results = [];
                    var container = types.find(this.xml, this._NS, 'always');
                    if (container.length === 0) {
                        return results;
                    }
                    container = container[0];
                    var jids = types.getMultiSubText(container, this._NS, 'jid');
                    jids.forEach(function (jid) {
                        results.push(new JID(jid.textContent));
                    });
                    return results;
                },
                set: function (value) {
                    if (value.length > 0) {
                        var container = types.find(this.xml, this._NS, 'never');
                        types.setMultiSubText(container, this._NS, 'jid', value);
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
    });

    stanza.withIq(function (Iq) {
        stanza.extend(Iq, MAMQuery);
        stanza.extend(Iq, Prefs);
    });

    stanza.withMessage(function (Message) {
        stanza.extend(Message, Archived, 'archived');
        stanza.extend(Message, Result);
    });
};
