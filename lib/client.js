"use strict";

var WildEmitter = require('wildemitter');
var _ = require('underscore');
var async = require('async');
var uuid = require('node-uuid');
var paddle = require('paddle');
var SASL = require('./stanza/sasl');
var Message = require('./stanza/message');
var Presence = require('./stanza/presence');
var Iq = require('./stanza/iq');
var JID = require('./jid');
var WSConnection = require('./websocket');
var getHostMeta = require('hostmeta');
var SASLFactory = require('saslmechanisms');

SASLFactory = new SASLFactory();
SASLFactory.use(require('sasl-external'));
SASLFactory.use(require('sasl-scram-sha-1'));
SASLFactory.use(require('sasl-digest-md5'));
SASLFactory.use(require('sasl-plain'));
SASLFactory.use(require('sasl-anonymous'));


// Ensure that all basic stanza relationships are established
require('./stanza/stream');
require('./stanza/sm');
require('./stanza/roster');
require('./stanza/error');
require('./stanza/streamError');
require('./stanza/streamFeatures');
require('./stanza/bind');
require('./stanza/session');


function Client(opts) {
    var self = this;

    WildEmitter.call(this);

    opts = opts || {};
    this.config = _.extend({
        useStreamManagement: true,
        transport: 'websocket'
    }, opts);

    this.jid = new JID();

    this._idPrefix = uuid.v4();
    this._idCount = 0;

    this.timeoutMonitor = null;

    this.negotiatedFeatures = {};
    this.featureOrder = [
        'sasl',
        'streamManagement',
        'bind',
        'streamManagement',
        'session'
    ];
    this.features = {};

    this.transport = new WSConnection();
    this.transport.on('*', function (eventName, data) {
        self.emit(eventName, data);
    });

    this.on('streamFeatures', function (features) {
        var series = [function (cb) { cb(null, features); }];
        var seriesNames = ['setup'];

        self.featureOrder.forEach(function (name) {
            if (features._extensions[name] && !self.negotiatedFeatures[name]) {
                series.push(function (features, cb) {
                    if (!self.negotiatedFeatures[name] && self.features[name]) {
                        self.features[name](features, cb);
                    } else {
                        cb(null, features);
                    }
                });
                seriesNames.push(name);
            }
        });

        async.waterfall(series, function (cmd) {
            if (cmd === 'restart') {
                self.transport.restart();
            } else if (cmd === 'disconnect') {
                self.disconnect();
            }
        });
    });

    this.features.sasl = function (features, cb) {
        var mech = SASLFactory.create(features.sasl.mechanisms);

        self.on('sasl:success', 'sasl', function () {
            self.negotiatedFeatures.sasl = true;
            self.releaseGroup('sasl');
            self.emit('auth:success');
            cb('restart');
        });
        self.on('sasl:challenge', 'sasl', function (challenge) {
            mech.challenge(challenge.value);
            self.send(new SASL.Response({
                value: mech.response(self.getCredentials())
            }));

            if (mech.cache) {
                _.each(mech.cache, function (val, key) {
                    self.config.credentials[key] = btoa(val);
                });
                self.emit('credentials:update', self.config.credentials);
            }

            cb();
        });
        self.on('sasl:failure', 'sasl', function () {
            self.releaseGroup('sasl');
            self.emit('auth:failed');
            cb('disconnect');
        });
        self.on('sasl:abort', 'sasl', function () {
            self.releaseGroup('sasl');
            self.emit('auth:failed');
            cb('disconnect');
        });

        var auth = {
            mechanism: mech.name
        };

        if (mech.clientFirst) {
            auth.value = mech.response(self.getCredentials());
        }
        self.send(new SASL.Auth(auth));
    };

    this.features.bind = function (features, cb) {
        self.sendIq({
            type: 'set',
            bind: {
                resource: self.config.resource
            }
        }, function (err, resp) {
            self.negotiatedFeatures.bind = true;
            self.emit('session:bound', resp.bind.jid);
            self.jid = new JID(resp.bind.jid);
            if (!features._extensions.session) {
                self.sessionStarted = true;
                self.emit('session:started', resp.bind.jid);
            }
            cb(null, features);
        });
    };

    this.features.session = function (features, cb) {
        self.sendIq({
            type: 'set',
            session: {}
        }, function () {
            self.negotiatedFeatures.session = true;
            self.sessionStarted = true;
            self.emit('session:started', self.jid);
            cb(null, features);
        });
    };

    this.features.streamManagement = function (features, cb) {
        if (!self.config.useStreamManagement) {
            return cb(null, features);
        }

        self.on('stream:management:enabled', 'sm', function (enabled) {
            self.transport.sm.enabled(enabled);
            self.negotiatedFeatures.streamManagement = true;

            self.on('stream:management:ack', 'connection', function (ack) {
                self.transport.sm.process(ack);
            });

            self.on('stream:management:request', 'connection', function (request) {
                self.transport.sm.ack();
            });

            self.releaseGroup('sm');
            cb(null, features);
        });

        self.on('stream:management:resumed', 'sm', function (resumed) {
            self.transport.sm.enabled(resumed);
            self.negotiatedFeatures.streamManagement = true;
            self.negotiatedFeatures.bind = true;
            self.sessionStarted = true;

            self.on('stream:management:ack', 'connection', function (ack) {
                self.transport.sm.process(ack);
            });

            self.on('stream:management:request', 'connection', function (request) {
                self.transport.sm.ack();
            });

            self.releaseGroup('sm');
            cb(null, features);
        });

        self.on('stream:management:failed', 'sm', function (failed) {
            self.transport.sm.failed();
            self.emit('session:end');
            self.releaseGroup('session');
            self.releaseGroup('sm');
            cb(null, features);
        });

        if (!self.transport.sm.id) {
            if (self.negotiatedFeatures.bind) {
                self.transport.sm.enable();
            } else {
                cb(null, features);
            }
        } else if (self.transport.sm.id && self.transport.sm.allowResume) {
            self.transport.resume();
        } else {
            cb(null, features);
        }
    };

    this.on('disconnected', function () {
        self.sessionStarted = false;
        self.negotiatedFeatures.sasl = false;
        self.negotiatedFeatures.streamManagement = false;
        self.negotiatedFeatures.bind = false;
        self.negotiatedFeatures.session = false;
        self.releaseGroup('connection');
    });

    this.on('iq:set:roster', function (iq) {
        self.emit('roster:update', iq);
        self.sendIq({
            id: iq.id,
            type: 'result'
        });
    });

    this.on('iq', function (iq) {
        var iqType = iq.type;
        var exts = Object.keys(iq._extensions);
        var children = iq.xml.childNodes;

        var childCount = 0;
        _.each(children, function (child) {
            if (child.nodeType === 1) {
                childCount += 1;
            }
        });

        if (iq.type === 'get' || iq.type === 'set') {
            // Invalid request
            if (childCount != 1) {
                return self.sendIq(iq.errorReply({
                    error: {
                        type: 'modify',
                        condition: 'bad-request'
                    }
                }));
            }

            // Valid request, but we don't have support for the
            // payload data.
            if (!exts.length) {
                return self.sendIq(iq.errorReply({
                    error: {
                        type: 'cancel',
                        condition: 'feature-not-implemented'
                    }
                }));
            }

            var iqEvent = 'iq:' + iqType + ':' + exts[0];
            if (self.callbacks[iqEvent]) {
                self.emit(iqEvent, iq);
            } else {
                // We support the payload data, but there's
                // nothing registered to handle it.
                self.sendIq(iq.errorReply({
                    error: {
                        type: 'cancel',
                        condition: 'feature-not-implemented'
                    }
                }));
            }
        }
    });

    this.on('message', function (msg) {
        if (Object.keys(msg.$body).length) {
            if (msg.type === 'chat' || msg.type === 'normal') {
                self.emit('chat', msg);
            } else if (msg.type === 'groupchat') {
                self.emit('groupchat', msg);
            }
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
    return this.transport ? this.transport.stream : undefined;
});

Client.prototype.use = function (pluginInit) {
    pluginInit(this);
};

Client.prototype.nextId = function () {
    return this._idPrefix + '-' + (this._idCount++).toString(16);
};

Client.prototype.discoverBindings = function (server, cb) {
    getHostMeta(server, function (err, data) {
        if (err) return cb(err, []);

        var results = [];
        var links = data.links || [];

        links.forEach(function (link) {
            if (link.href && link.rel === 'urn:xmpp:altconnect:websocket') {
                results.push(link.href);
            }
        });

        cb(false, results);
    });
};

Client.prototype.getCredentials = function () {
    var creds = this.config.credentials || {};
    var requestedJID = new JID(this.config.jid);

    var username = creds.username || requestedJID.local;
    var server = creds.server || requestedJID.domain;

    var defaultCreds = {
        username: username,
        password: this.config.password,
        server: server,
        host: server,
        realm: server,
        serviceType: 'xmpp',
        serviceName: server
    };

    var result = _.extend(defaultCreds, creds);

    var cachedBinary = ['saltedPassword', 'clientKey', 'serverKey'];
    cachedBinary.forEach(function (key) {
        if (result[key]) {
            result[key] = atob(result[key]);
        }
    });

    return result;
};

Client.prototype.connect = function (opts) {
    var self = this;

    _.extend(self.config, opts || {});

    // Default iq timeout of 15 seconds
    if (!self.timeoutMonitor) {
        self.timeoutMonitor = new paddle.Paddle(self.config.timeout || 15);
        self.timeoutMonitor.start();
    }

    if (self.config.wsURL) {
        return self.transport.connect(self.config);
    }

    self.discoverBindings(self.config.server, function (err, endpoints) {
        if (!err && endpoints.length) {
            self.config.wsURL = endpoints[0];
            self.transport.connect(self.config);
        } else {
            self.disconnect();
        }
    });
};

Client.prototype.disconnect = function () {
    if (this.timeoutMonitor) {
        this.timeoutMonitor.stop();
        this.timeoutMonitor = null;
    }
    if (this.sessionStarted) {
        this.emit('session:end');
        this.releaseGroup('session');
    }
    this.sessionStarted = false;
    this.releaseGroup('connection');
    if (this.transport) {
        this.transport.disconnect();
    }
};

Client.prototype.send = function (data) {
    this.transport.send(data);
};

Client.prototype.sendMessage = function (data) {
    data = data || {};
    if (!data.id) {
        data.id = this.nextId();
    }
    var message = new Message(data);

    this.emit('message:sent', message);
    this.send(message);

    return data.id;
};

Client.prototype.sendPresence = function (data) {
    data = data || {};
    if (!data.id) {
        data.id = this.nextId();
    }
    this.send(new Presence(data));

    return data.id;
};

Client.prototype.sendIq = function (data, cb) {
    var self = this;
    data = data || {};
    cb = cb || function () {};
    if (!data.id) {
        data.id = this.nextId();
    }

    var called = false;
    var rescb = function (err, result) {
        if (!called) {
            called = true;
            cb(err, result);
        }
    };

    if (data.type === 'get' || data.type === 'set') {
        var timeoutCheck = this.timeoutMonitor.insure(function () {
            rescb({type: 'error', error: {condition: 'timeout'}}, null);
        });

        var dest = new JID(data.to);
        var allowed = {};
        allowed[''] = true;
        allowed[dest.full] = true;
        allowed[dest.bare] = true;
        allowed[dest.domain] = true;
        allowed[self.jid.bare] = true;
        allowed[self.jid.domain] = true;

        var handler = function (resp) {
            var source = resp.from;
            if (!allowed[source.full]) return;

            timeoutCheck.check_in();
            self.off('id:' + data.id, handler);
            if (resp._extensions.error) {
                rescb(resp, null);
            } else {
                rescb(null, resp);
            }
        };

        this.on('id:' + data.id, 'session', handler);
    }
    if (!data.toJSON) {
        data = new Iq(data);
    }
    this.send(data);

    return data.id;
};

Client.prototype.getRoster = function (cb) {
    var self = this;
    cb = cb || function () {};

    this.sendIq({
        type: 'get',
        roster: {
            ver: self.config.rosterVer
        }
    }, function (err, resp) {
        if (err) {
            return cb(err);
        }
        if (resp.type === 'result') {
            if (resp.roster.ver) {
                self.config.rosterVer = resp.roster.ver;
                self.emit('roster:ver', resp.roster.ver);
            }
        }
        cb(null, resp);
    });
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

Client.prototype.JID = function (jid) {
    return new JID(jid);
};


module.exports = Client;
