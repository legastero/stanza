var WildEmitter = require('wildemitter'),
    _ = require('lodash'),
    async = require('async'),
    uuid = require('node-uuid'),
    stanza = require('./stanza/stanza'),
    SASL = require('./stanza/sasl'),
    Message = require('./stanza/message').Message,
    Presence = require('./stanza/presence').Presence,
    Iq = require('./stanza/iq').Iq,
    WSConnection = require('./websocket').WSConnection;


function Client(opts) {
    var self = this;

    WildEmitter.call(this);

    this.config = opts || {};
    this._idPrefix = uuid.v4();
    this._idCount = 0;

    this.negotiatedFeatures = {};
    this._features = [
        {name: 'starttls', restart: true},
        {name: 'sasl', restart: true},
        {name: 'rosterVersioningFeature'},
        {name: 'subscriptionPreApprovalFeature'},
        {name: 'bind'},
        {name: 'session'}
    ];

    this.conn = new WSConnection();
    this.conn.on('*', function (eventName, data) {
        self.emit(eventName, data);    
    });

    this.on('streamFeatures', function (features) {
        for (var i = 0, len = self._features.length; i < len; ++i) {
            var ext = self._features[i];
            if (features._extensions[ext.name] && !self.negotiatedFeatures[ext.name]) {
                self.emit(ext.name, features._extensions[ext.name]);
                if (ext.restart) {
                    break;
                }
            }
        }
    });

    this.on('sasl', function (mechs) {
        self.once('saslSuccess', function () {
            self.negotiatedFeatures.sasl = true;
            self.conn.restart();
        });

        self.once('saslFailure', function () {
            self.disconnect();
        });

        self.send(new SASL.Auth({
            mechanism: 'PLAIN',
            value: '\x00' + self.config.username + '\x00' + self.config.password
        }));
    });

    this.on('bind', function (bind) {
        self.sendIq({
            type: 'set',
            bind: {
                resource: self.config.resource
            }
        }, function (resp) {
            self.negotiatedFeatures.bind = true;
            self.emit('sessionBound', resp.bind.jid);
            if (!bind.parent._extensions.session) {
                self.emit('sessionStarted', resp.bind.jid);
            }
        });
    });

    this.on('session', function () {
        self.sendIq({
            type: 'set',
            session: {}
        }, function () {
            self.negotiatedFeatures.session = true;
            self.emit('sessionStarted');
        });
    });

    this.on('iq:set:roster', function (iq) {
        self.emit('rosterUpdate', iq);
        self.sendIq({
            id: iq.id,
            type: 'result'
        });
    });

    this.on('iq', function (iq) {
        var iqType = iq.type,
            exts = Object.keys(iq._extensions),
            children = iq.xml.childNodes;

        if (iq.type === 'get' || iq.type === 'set') {
            // Invalid request
            if (children.length != 1) {
                return client.sendIq({
                    id: iq.id,
                    type: 'error',
                    error: {
                        type: 'modify',
                        condition: 'bad-request'
                    }
                });
            }

            // Valid request, but we don't have support for the
            // payload data.
            if (!exts.length) {
                return client.sendIq({
                    id: iq.id,
                    type: 'error',
                    error: {
                        type: 'cancel',
                        condition: 'feature-not-implemented'
                    }
                });
            }

            var iqEvent = 'iq:' + iqType + ':' + exts[0];
            if (self.callbacks[iqEvent]) {
                self.emit(iqEvent, iq);
            } else {
                // We support the payload data, but there's
                // nothing registered to handle it.
                client.sendIq({
                    id: iq.id,
                    type: 'error',
                    error: {
                        type: 'cancel',
                        condition: 'feature-not-implemented'
                    }
                });
            }
        }
    });

    this.on('message', function (msg) {
        if (Object.keys(msg.$body)) {
            self.emit('chat', msg);
        }
    });

    this.on('presence', function (pres) {
        var presType = pres.type || 'available';
        self.emit(presType, pres);
    });
}

Client.prototype = Object.create(WildEmitter.prototype, {
    constructor: {
        value: Client
    }
});

Client.prototype.__defineGetter__('stream', function () {
    return this.conn ? this.conn.stream : undefined;
});

Client.prototype.nextId = function () {
    return this._idPrefix + '-' + (this._idCount++).toString(16);
};

Client.prototype.connect = function (opts) {
    this.conn.connect(this.config);
};

Client.prototype.disconnect = function () {
    if (this.conn) {
        this.conn.disconnect();
    }
};

Client.prototype.send = function (data) {
    this.conn.send(data);
};

Client.prototype.sendMessage = function (data) {
    data = data || {};
    if (!data.id) {
        data.id = this.nextId();
    }
    this.conn.send(new Message(data));
};

Client.prototype.sendPresence = function (data) {
    data = data || {};
    if (!data.id) {
        data.id = this.nextId();
    }
    this.conn.send(new Presence(data));
};

Client.prototype.sendIq = function (data, cb) {
    data = data || {};
    if (!data.id) {
        data.id = this.nextId();
    }
    if (data.type === 'get' || data.type === 'set') {
        this.once('id:' + data.id, cb);
    }
    this.conn.send(new Iq(data));
};

Client.prototype.getRoster = function (cb) {
    this.sendIq({
        type: 'get',
        roster: {
            ver: this.config.rosterVer
        }
    }, cb);
};

Client.prototype.updateRosterItem = function (item, cb) {
    this.sendIq({
        type: 'set',
        roster: {
            items: [item]
        }
    }, cb);
};

Client.prototype.removeRosterItem = function (jid, cb) {
    this.updateRosterItem({jid: jid, subscription: 'remove'}, cb);
};

Client.prototype.subscribe = function (jid) {
    this.sendPresence({type: 'subscribe', to: jid});
};

Client.prototype.unsubscribe = function (jid) {
    this.sendPresence({type: 'unsubscribe', to: jid});
};

Client.prototype.acceptSubscription = function (jid) {
    this.sendPresence({type: 'subscribed', to: jid});
};

Client.prototype.denySubscription = function (jid) {
    this.sendPresence({type: 'unsubscribed', to: jid});
};


exports.Client = Client;
exports.createClient = function (opts) {
    return new Client(opts);
};
