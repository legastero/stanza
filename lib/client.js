'use strict';

var _ = require('underscore');
var WildEmitter = require('wildemitter');
var util = require('util');
var Promise = require('bluebird');
var async = require('async');
var uuid = require('node-uuid');
var b64decode = require('atob');
var b64encode = require('btoa');
var SASL = require('./stanza/sasl');
var Message = require('./stanza/message');
var Presence = require('./stanza/presence');
var StreamError = require('./stanza/streamError');
var Iq = require('./stanza/iq');
var JID = require('./jid');
var StreamManagement = require('./sm');
var WSConnection = require('./transports/websocket');
var OldWSConnection = require('./transports/old-websocket');
var BOSHConnection = require('./transports/bosh');
var getHostMeta = require('hostmeta');
var SASLFactory = require('saslmechanisms');


var SASL_MECHS = {
    external: require('sasl-external'),
    'scram-sha-1': require('sasl-scram-sha-1'),
    'digest-md5': require('sasl-digest-md5'),
    plain: require('sasl-plain'),
    anonymous: require('sasl-anonymous')
};


// Ensure that all basic stanza relationships are established
require('./stanza/stream');
require('./stanza/sm');
require('./stanza/error');
require('./stanza/streamFeatures');
require('./stanza/bind');
require('./stanza/session');


function Client(opts) {
    var self = this;

    WildEmitter.call(this);

    opts = opts || {};
    this._initConfig(opts);

    this.jid = new JID();

    this.transports = {
        websocket: WSConnection,
        bosh: BOSHConnection,
        'old-websocket': OldWSConnection
    };

    this.negotiatedFeatures = {};
    this.featureOrder = [
        'sasl',
        'streamManagement',
        'bind',
        'streamManagement',
        'caps',
        'session'
    ];
    this.features = {};

    this.sm = new StreamManagement(this);

    this.on('stream:data', function (data) {
        var json = data.toJSON();

        if (data._name === 'iq') {
            json._xmlChildCount = 0;
            _.each(data.xml.childNodes, function (child) {
                if (child.nodeType === 1) {
                    json._xmlChildCount += 1;
                }
            });
        }

        self.emit(data._eventname || data._name, json);
        if (data._name === 'message' || data._name === 'presence' || data._name === 'iq') {
            self.sm.handle(json);
            self.emit('stanza', json);
        } else if (data._name === 'smAck') {
            return self.sm.process(json);
        } else if (data._name === 'smRequest') {
            return self.sm.ack();
        }

        if (json.id) {
            self.emit('id:' + json.id, json);
        }
    });

    this.on('streamFeatures', function (features) {
        var series = [];

        self.featureOrder.forEach(function (name) {
            if (features[name] && !self.negotiatedFeatures[name]) {
                series.push(function (cb) {
                    if (!self.negotiatedFeatures[name] && self.features[name]) {
                        self.features[name](features, cb);
                    } else {
                        cb();
                    }
                });
            }
        });

        async.series(series, function (cmd, msg) {
            if (cmd === 'restart') {
                self.transport.restart();
            } else if (cmd === 'disconnect') {
                var serr = new StreamError({
                    condition: 'policy-violation',
                    text: 'failed to negotiate stream features: ' + msg
                });
                self.emit('stream:error', serr);
                self.disconnect();
            } 
        });
    });

    this.features.sasl = function (features, cb) {
        var mech = self.SASLFactory.create(features.sasl.mechanisms);
        if (!mech) {
            self.releaseGroup('sasl');
            self.emit('auth:failed');
            return cb('disconnect', 'authentication failed');
        }

        self.on('sasl:success', 'sasl', function () {
            self.negotiatedFeatures.sasl = true;
            self.releaseGroup('sasl');
            self.emit('auth:success', self.config.credentials);
            cb('restart');
        });
        self.on('sasl:challenge', 'sasl', function (challenge) {
            mech.challenge(challenge.value);
            self.send(new SASL.Response({
                value: mech.response(self.getCredentials())
            }));

            if (mech.cache) {
                _.each(mech.cache, function (val, key) {
                    if (val) {
                        self.config.credentials[key] = b64encode(val);
                    }
                });
                self.emit('credentials:update', self.config.credentials);
            }

            cb();
        });
        self.on('sasl:failure', 'sasl', function () {
            self.releaseGroup('sasl');
            self.emit('auth:failed');
            cb('disconnect', 'authentication failed');
        });
        self.on('sasl:abort', 'sasl', function () {
            self.releaseGroup('sasl');
            self.emit('auth:failed');
            cb('disconnect', 'authentication failed');
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
            if (err) {
                self.emit('session:error', err);
                return cb('disconnect', 'JID binding failed');
            }

            self.negotiatedFeatures.bind = true;
            self.emit('session:bound', resp.bind.jid);
            self.jid = new JID(resp.bind.jid);
            var canStartSession = !features.session || (features.session && features.session.optional);
            if (!self.sessionStarted && canStartSession) {
                self.sessionStarted = true;
                self.emit('session:started', resp.bind.jid);
            }
            cb();
        });
    };

    this.features.session = function (features, cb) {
        if (features.session.optional || self.sessionStarted) {
            self.negotiatedFeatures.session = true;
            return cb();
        }

        self.sendIq({
            type: 'set',
            session: {}
        }, function (err) {
            if (err) {
                return cb('disconnect', 'session request failed');
            }

            self.negotiatedFeatures.session = true;
            if (!self.sessionStarted) {
                self.sessionStarted = true;
                self.emit('session:started', self.jid);
            }
            cb();
        });
    };

    this.features.caps = function (features, cb) {
        self.emit('disco:caps', {from: new JID(self.jid.domain), caps: features.caps});
        self.negotiatedFeatures.caps = true;
        cb();
    };

    this.features.streamManagement = function (features, cb) {
        if (!self.config.useStreamManagement) {
            return cb();
        }

        self.on('stream:management:enabled', 'sm', function (enabled) {
            self.sm.enabled(enabled);
            self.negotiatedFeatures.streamManagement = true;
            self.releaseGroup('sm');
            cb();
        });

        self.on('stream:management:resumed', 'sm', function (resumed) {
            self.sm.resumed(resumed);
            self.negotiatedFeatures.streamManagement = true;
            self.negotiatedFeatures.bind = true;
            self.sessionStarted = true;
            self.releaseGroup('sm');
            cb('break'); // Halt further processing of stream features
        });

        self.on('stream:management:failed', 'sm', function () {
            self.sm.failed();
            self.emit('session:end');
            self.releaseGroup('session');
            self.releaseGroup('sm');
            cb();
        });

        if (!self.sm.id) {
            if (self.negotiatedFeatures.bind) {
                self.sm.enable();
            } else {
                cb();
            }
        } else if (self.sm.id && self.sm.allowResume) {
            self.sm.resume();
        } else {
            cb();
        }
    };

    this.on('disconnected', function () {
        if (self.transport) {
            self.transport.off('*');
            delete self.transport;
        }
        self.sessionStarted = false;
        self.negotiatedFeatures.sasl = false;
        self.negotiatedFeatures.streamManagement = false;
        self.negotiatedFeatures.bind = false;
        self.negotiatedFeatures.session = false;
        self.releaseGroup('connection');
    });

    this.on('iq', function (iq) {
        var iqType = iq.type;
        var xmlChildCount = iq._xmlChildCount;
        delete iq._xmlChildCount;

        var exts = Object.keys(iq);

        if (iq.type === 'get' || iq.type === 'set') {
            // Invalid request
            if (xmlChildCount !== 1) {
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
        if (Object.keys(msg.$body || {}).length) {
            if (msg.type === 'chat' || msg.type === 'normal') {
                self.emit('chat', msg);
            } else if (msg.type === 'groupchat') {
                self.emit('groupchat', msg);
            }
        }
        if (msg.type === 'error') {
            self.emit('message:error', msg);
        }
    });

    this.on('presence', function (pres) {
        var presType = pres.type || 'available';
        if (presType === 'error') {
            presType = 'presence:error';
        }
        self.emit(presType, pres);
    });
}

util.inherits(Client, WildEmitter);

Object.defineProperty(Client.prototype, 'stream', {
    get: function () {
        return this.transport ? this.transport.stream : undefined;
    }
});

Client.prototype._initConfig = function (opts) {
    var self = this;
    var currConfig = this.config || {};

    this.config = _.extend({
        useStreamManagement: true,
        transports: ['websocket', 'bosh'],
        sasl: ['external', 'scram-sha-1', 'digest-md5', 'plain', 'anonymous']
    }, currConfig, opts);

    // Enable SASL authentication mechanisms (and their preferred order)
    // based on user configuration.
    if (!_.isArray(this.config.sasl)) {
        this.config.sasl = [this.config.sasl];
    }

    this.SASLFactory = new SASLFactory();
    this.config.sasl.forEach(function (mech) {
        if (typeof mech === 'string') {
            var existingMech = SASL_MECHS[mech.toLowerCase()];
            if (existingMech) {
                self.SASLFactory.use(existingMech);
            }
        } else {
            self.SASLFactory.use(mech);
        }
    });

    this.config.jid = new JID(this.config.jid);

    if (!this.config.server) {
        this.config.server = this.config.jid.domain;
    }

    if (this.config.password) {
        this.config.credentials = this.config.credentials || {};
        this.config.credentials.password = this.config.password;
        delete this.config.password;
    }

    if (this.config.transport) {
        this.config.transports = [this.config.transport];
    }

    if (!_.isArray(this.config.transports)) {
        this.config.transports = [this.config.transports];
    }
};

Client.prototype.use = function (pluginInit) {
    pluginInit(this);
};

Client.prototype.nextId = function () {
    return uuid.v4();
};

Client.prototype.discoverBindings = function (server, cb) {
    getHostMeta(server, function (err, data) {
        if (err) {
            return cb(err, []);
        }

        var results = {
            websocket: [],
            bosh: []
        };
        var links = data.links || [];

        links.forEach(function (link) {
            if (link.href && link.rel === 'urn:xmpp:alt-connections:websocket') {
                results.websocket.push(link.href);
            }
            if (link.href && link.rel === 'urn:xmpp:altconnect:websocket') {
                results.websocket.push(link.href);
            }
            if (link.href && link.rel === 'urn:xmpp:alt-connections:xbosh') {
                results.bosh.push(link.href);
            }
            if (link.href && link.rel === 'urn:xmpp:altconnect:bosh') {
                results.bosh.push(link.href);
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
            result[key] = b64decode(result[key]);
        }
    });

    return result;
};

Client.prototype.connect = function (opts, transInfo) {
    var self = this;

    this._initConfig(opts);

    if (transInfo && transInfo.name && transInfo.url) {
        var trans = self.transport = new self.transports[transInfo.name](self.sm);
        trans.on('*', function (event, data) {
            self.emit(event, data);
        });
        return trans.connect(self.config);
    }

    if (!transInfo && self.config.transports.length === 1) {
        transInfo = {};
        transInfo.name = self.config.transports[0];
        if (transInfo.name === 'websocket' || transInfo.name === 'old-websocket') {
            transInfo.url = self.config.wsURL;
        }
        if (transInfo.name === 'bosh') {
            transInfo.url = self.config.boshURL;
        }
        if (transInfo.name && transInfo.url) {
            return self.connect(null, transInfo);
        }
    }

    return self.discoverBindings(self.config.server, function (err, endpoints) {
        if (err) {
            return self.disconnect();
        }

        for (var t = 0, tlen = self.config.transports.length; t < tlen; t++) {
            var transport = self.config.transports[t];
            console.log('Checking for %s endpoints', transport);
            for (var i = 0, len = (endpoints[transport] || []).length; i < len; i++) {
                var uri = endpoints[transport][i];
                if (uri.indexOf('wss://') === 0 || uri.indexOf('https://') === 0) {
                    if (transport === 'websocket') {
                        self.config.wsURL = uri;
                    } else {
                        self.config.boshURL = uri;
                    }
                    console.log('Using %s endpoint: %s', transport, uri);
                    return self.connect(null, {
                        name: transport,
                        url: uri
                    });
                } else {
                    console.warn('Discovered unencrypted %s endpoint (%s). Ignoring', transport, uri);
                }
            }
        }
        console.warn('No endpoints found for the requested transports.');
        return self.disconnect();
    });
};

Client.prototype.disconnect = function () {
    if (this.sessionStarted) {
        this.releaseGroup('session');
        if (!this.sm.started) {
            // Only emit session:end if we had a session, and we aren't using
            // stream management to keep the session alive.
            this.emit('session:end');
        }
    }
    this.sessionStarted = false;
    this.releaseGroup('connection');
    if (this.transport) {
        this.transport.disconnect();
    } else {
        this.emit('disconnected');
    }
};

Client.prototype.send = function (data) {
    if (this.transport) {
        this.transport.send(data);
    }
    this.sm.track(data);
};

Client.prototype.sendMessage = function (data) {
    data = data || {};
    if (!data.id) {
        data.id = this.nextId();
    }
    var message = new Message(data);

    this.emit('message:sent', message.toJSON());
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
    var result, respEvent, allowed, dest;
    var self = this;

    data = data || {};
    if (!data.id) {
        data.id = this.nextId();
    }

    var iq = (!data.toJSON) ? new Iq(data) : data;

    if (data.type === 'error' || data.type === 'result') {
        this.send(iq);
        return;
    }

    dest = new JID(data.to);
    allowed = {};
    allowed[''] = true;
    allowed[dest.full] = true;
    allowed[dest.bare] = true;
    allowed[dest.domain] = true;
    allowed[self.jid.bare] = true;
    allowed[self.jid.domain] = true;

    respEvent = 'id:' + data.id;
    result = new Promise(function (resolve, reject) {
        var handler = function (res) {
            if (!allowed[res.from.full]) {
                return;
            }

            self.off(respEvent, handler);
            if (!res.error) {
                resolve(res);
            } else {
                reject(res);
            }
        };
        self.on(respEvent, 'session', handler);
    });

    this.send(iq);

    return result.timeout(self.config.timeout * 1000 || 15000)
        .catch(Promise.TimeoutError, function () {
            throw {type: 'error', error: {condition: 'timeout'}};
        })
        .nodeify(cb);
};

Client.prototype.sendStreamError = function (data) {
    data = data || {};

    var error = new StreamError(data);

    this.emit('stream:error', error);
    this.send(error);
    this.disconnect();
};

Client.prototype.JID = function (jid) {
    return new JID(jid);
};


module.exports = Client;
