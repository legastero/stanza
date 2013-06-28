var stanza = require('./stanza');
var Message = require('./message');


function ChatStateActive(data, xml) {
    return stanza.init(this, xml, data);
}
ChatStateActive.prototype = {
    constructor: {
        value: ChatStateActive
    },
    NS: 'http://jabber.org/protocol/chatstates',
    EL: 'active',
    _name: 'chatStateActive',
    _eventname: 'chat:active',
    toString: stanza.toString,
    toJSON: undefined
};


function ChatStateComposing(data, xml) {
    return stanza.init(this, xml, data);
}
ChatStateComposing.prototype = {
    constructor: {
        value: ChatStateComposing
    },
    NS: 'http://jabber.org/protocol/chatstates',
    EL: 'composing',
    _name: 'chatStateComposing',
    _eventname: 'chat:composing',
    toString: stanza.toString,
    toJSON: undefined
};


function ChatStatePaused(data, xml) {
    return stanza.init(this, xml, data);
}
ChatStatePaused.prototype = {
    constructor: {
        value: ChatStatePaused
    },
    NS: 'http://jabber.org/protocol/chatstates',
    EL: 'paused',
    _name: 'chatStatePaused',
    _eventname: 'chat:paused',
    toString: stanza.toString,
    toJSON: undefined
};


function ChatStateInactive(data, xml) {
    return stanza.init(this, xml, data);
}
ChatStateInactive.prototype = {
    constructor: {
        value: ChatStateInactive
    },
    NS: 'http://jabber.org/protocol/chatstates',
    EL: 'inactive',
    _name: 'chatStateInactive',
    _eventname: 'chat:inactive',
    toString: stanza.toString,
    toJSON: undefined
};


function ChatStateGone(data, xml) {
    return stanza.init(this, xml, data);
}
ChatStateGone.prototype = {
    constructor: {
        value: ChatStateGone
    },
    NS: 'http://jabber.org/protocol/chatstates',
    EL: 'gone',
    _name: 'chatStateGone',
    _eventname: 'chat:gone',
    toString: stanza.toString,
    toJSON: undefined
};


stanza.extend(Message, ChatStateActive);
stanza.extend(Message, ChatStateComposing);
stanza.extend(Message, ChatStatePaused);
stanza.extend(Message, ChatStateInactive);
stanza.extend(Message, ChatStateGone);


Message.prototype.__defineGetter__('chatState', function () {
    var self = this;
    var states = ['Active', 'Composing', 'Paused', 'Inactive', 'Gone'];

    for (var i = 0; i < states.length; i++) {
        if (self._extensions['chatState' + states[i]]) {
            return states[i].toLowerCase();
        }
    }
    return '';
});
Message.prototype.__defineSetter__('chatState', function (value) {    
    var self = this;
    var states = ['Active', 'Composing', 'Paused', 'Inactive', 'Gone'];

    states.forEach(function (state) {
        if (self._extensions['chatState' + state]) {
            self.xml.removeChild(self._extensions['chatState' + state].xml);
            delete self._extensions['chatState' + state];
        }
    });
    if (value) {
        this['chatState' + value.charAt(0).toUpperCase() + value.slice(1)];
    }
});
