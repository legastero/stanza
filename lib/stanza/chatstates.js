'use strict';

var stanza = require('jxt');
var Message = require('./message');

var NS = 'http://jabber.org/protocol/chatstates';

var Active = stanza.define({
    name: 'chatStateActive',
    eventName: 'chat:active',
    namespace: NS,
    element: 'active'
});

var Composing = stanza.define({
    name: 'chatStateComposing',
    eventName: 'chat:composing',
    namespace: NS,
    element: 'composing'
});

var Paused = stanza.define({
    name: 'chatStatePaused',
    eventName: 'chat:paused',
    namespace: NS,
    element: 'paused'
});

var Inactive = stanza.define({
    name: 'chatStateInactive',
    eventName: 'chat:inactive',
    namespace: NS,
    element: 'inactive'
});

var Gone = stanza.define({
    name: 'chatStateGone',
    eventName: 'chat:gone',
    namespace: NS,
    element: 'gone'
});

stanza.extend(Message, Active);
stanza.extend(Message, Composing);
stanza.extend(Message, Paused);
stanza.extend(Message, Inactive);
stanza.extend(Message, Gone);

stanza.add(Message, 'chatState', {
    get: function () {
        var self = this;
        var states = ['Active', 'Composing', 'Paused', 'Inactive', 'Gone'];

        for (var i = 0; i < states.length; i++) {
            if (self._extensions['chatState' + states[i]]) {
                return states[i].toLowerCase();
            }
        }
        return '';
    },
    set: function (value) {
        var self = this;
        var states = ['Active', 'Composing', 'Paused', 'Inactive', 'Gone'];

        states.forEach(function (state) {
            if (self._extensions['chatState' + state]) {
                self.xml.removeChild(self._extensions['chatState' + state].xml);
                delete self._extensions['chatState' + state];
            }
        });
        if (value) {
            this['chatState' + value.charAt(0).toUpperCase() + value.slice(1)] = {};
        }
    }
});
