var WildEmitter = require('wildemitter'),
    _ = require('./lodash'),
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

    this.conn = new WSConnection();
    this.conn.on('*', function (eventName, data) {
        self.emit(eventName, data);    
    });

    this.on('streamFeatures', function (features) {
        _.each(features.features, function (ext, name) {
            self.emit(name, ext); 
        });
    });

    this.on('sasl', function (mechs) {
        self.once('saslSuccess', function () {
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

    this.on('bind', function () {
        self.sendIq({
            type: 'set',
            bind: {
                resource: self.config.resource
            }
        }, function (resp) {
            self.emit('sessionBound', resp.bind.jid);
        });
    });

    this.on('iq', function (iq) {
        var iqType = iq.type,
            exts = Object.keys(iq._extensions);

        if (!exts.length) {
            return client.sendIq({
                id: iq.id,
                type: 'error',
                error: {
                    type: 'modify',
                    condition: 'bad-request'
                }
            });
        }

        var extName = exts[0].name;
        
        if (iqType == 'get' || iqType == 'set') {
            var iqEvent = 'iq:' + iqType + ':' + extName;
            if (self.callbacks[iqEvent]) {
                self.emit(iqEvent, iq);
            } else {
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
