!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.XMPP=e():"undefined"!=typeof global?global.XMPP=e():"undefined"!=typeof self&&(self.XMPP=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.Message = require('./lib/stanza/message');
exports.Presence = require('./lib/stanza/presence');
exports.Iq = require('./lib/stanza/iq');

exports.Client = require('./lib/client');
exports.crypto = require('crypto');

exports.createClient = function (opts) {
    var client = new exports.Client(opts);

    client.use(require('./lib/plugins/disco'));
    client.use(require('./lib/plugins/chatstates'));
    client.use(require('./lib/plugins/delayed'));
    client.use(require('./lib/plugins/forwarding'));
    client.use(require('./lib/plugins/carbons'));
    client.use(require('./lib/plugins/time'));
    client.use(require('./lib/plugins/mam'));
    client.use(require('./lib/plugins/receipts'));
    client.use(require('./lib/plugins/idle'));
    client.use(require('./lib/plugins/correction'));
    client.use(require('./lib/plugins/attention'));
    client.use(require('./lib/plugins/version'));
    client.use(require('./lib/plugins/invisible'));
    client.use(require('./lib/plugins/muc'));
    client.use(require('./lib/plugins/pubsub'));
    client.use(require('./lib/plugins/avatar'));
    client.use(require('./lib/plugins/private'));
    client.use(require('./lib/plugins/bookmarks'));
    client.use(require('./lib/plugins/jingle'));
    client.use(require('./lib/plugins/json'));
    client.use(require('./lib/plugins/hashes'));

    return client;
};

},{"./lib/client":2,"./lib/plugins/attention":4,"./lib/plugins/avatar":5,"./lib/plugins/bookmarks":6,"./lib/plugins/carbons":7,"./lib/plugins/chatstates":8,"./lib/plugins/correction":9,"./lib/plugins/delayed":10,"./lib/plugins/disco":11,"./lib/plugins/forwarding":12,"./lib/plugins/hashes":13,"./lib/plugins/idle":14,"./lib/plugins/invisible":15,"./lib/plugins/jingle":16,"./lib/plugins/json":17,"./lib/plugins/mam":18,"./lib/plugins/muc":19,"./lib/plugins/private":20,"./lib/plugins/pubsub":21,"./lib/plugins/receipts":22,"./lib/plugins/time":23,"./lib/plugins/version":24,"./lib/stanza/iq":38,"./lib/stanza/message":42,"./lib/stanza/presence":44,"crypto":72}],2:[function(require,module,exports){
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

},{"./jid":3,"./stanza/bind":27,"./stanza/error":35,"./stanza/iq":38,"./stanza/message":42,"./stanza/presence":44,"./stanza/roster":48,"./stanza/sasl":51,"./stanza/session":52,"./stanza/sm":53,"./stanza/stream":54,"./stanza/streamError":55,"./stanza/streamFeatures":56,"./websocket":61,"async":62,"hostmeta":77,"node-uuid":105,"paddle":106,"sasl-anonymous":108,"sasl-digest-md5":110,"sasl-external":112,"sasl-plain":114,"sasl-scram-sha-1":116,"saslmechanisms":118,"underscore":119,"wildemitter":120}],3:[function(require,module,exports){
function JID(jid) {
    jid = jid || '';

    if (typeof jid === 'string') {
        this.jid = jid;
        this.parts = {};
    } else {
        this.jid = jid.jid;
        this.parts = jid.parts;
    }
}

JID.prototype = {
    constructor: {
        value: JID
    },
    toString: function () {
        return this.jid;
    },
    get full() {
        return this.jid;
    },
    get bare() {
        if (this.parts.bare) {
            return this.parts.bare;
        }

        var split = this.jid.indexOf('/');
        if (split > 0) {
            this.parts.bare = this.jid.slice(0, split);
        } else {
            this.parts.bare = this.jid;
        }
        return this.parts.bare;
    },
    get resource() {
        if (this.parts.resource) {
            return this.parts.resource;
        }

        var split = this.jid.indexOf('/');
        if (split > 0) {
            this.parts.resource = this.jid.slice(split + 1);
        } else {
            this.parts.resource = '';
        }
        return this.parts.resource;
    },
    get local() {
        if (this.parts.local) {
            return this.parts.local;
        }

        var bare = this.bare;
        var split = bare.indexOf('@');
        if (split > 0) {
            this.parts.local = bare.slice(0, split);
        } else {
            this.parts.local = bare;
        }

        return this.parts.local;
    },
    get domain() {
        if (this.parts.domain) {
            return this.parts.domain;
        }

        var bare = this.bare;
        var split = bare.indexOf('@');
        if (split > 0) {
            this.parts.domain = bare.slice(split + 1);
        } else {
            this.parts.domain = bare;
        }

        return this.parts.domain;
    }
};


module.exports = JID;

},{}],4:[function(require,module,exports){
module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:attention:0');


    client.getAttention = function (jid, opts) {
        opts = opts || {};
        opts.to = jid;
        opts.type = 'headline';
        opts.attention = true;
        client.sendMessage(opts);
    };

    client.on('message', function (msg) {
        if (msg._extensions._attention) {
            client.emit('attention', msg);
        }
    });
};

},{}],5:[function(require,module,exports){
var stanzas = require('../stanza/avatar');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:avatar:metadata+notify');

    client.on('pubsubEvent', function (msg) {
        if (!msg.event._extensions.updated) return;
        if (msg.event.updated.node !== 'urn:xmpp:avatar:metadata') return;

        client.emit('avatar', {
            jid: msg.from,
            avatars: msg.event.updated.published[0].avatars
        });
    });

    client.publishAvatar = function (id, data, cb) {
        client.publish('', 'urn:xmpp:avatar:data', {
            id: id,
            avatarData: data
        }, cb);
    };

    client.useAvatars = function (info, cb) {
        client.publish('', 'urn:xmpp:avatar:metadata', {
            id: 'current',
            avatars: info
        }, cb);
    };

    client.getAvatar = function (jid, id, cb) {
        client.getItem(jid, 'urn:xmpp:avatar:data', id, cb);
    };
};

},{"../stanza/avatar":26}],6:[function(require,module,exports){
var stanzas = require('../stanza/bookmarks');


module.exports = function (client) {

    client.getBookmarks = function (cb) {
        this.getPrivateData({bookmarks: {}}, cb);
    };

    client.setBookmarks = function (opts, cb) {
        this.setPrivateData({bookmarks: opts}, cb);
    };

};

},{"../stanza/bookmarks":28}],7:[function(require,module,exports){
var stanzas = require('../stanza/carbons');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:carbons:2');

    client.enableCarbons = function (cb) {
        this.sendIq({
            type: 'set',
            enableCarbons: true
        }, cb);
    };

    client.disableCarbons = function (cb) {
        this.sendIq({
            type: 'set',
            disableCarbons: true
        }, cb);
    };

    client.on('message', function (msg) {
        if (msg._extensions.carbonSent) {
            return client.emit('carbon:sent', msg);
        }
        if (msg._extensions.carbonReceived) {
            return client.emit('carbon:received', msg);
        }
    });
};

},{"../stanza/carbons":30}],8:[function(require,module,exports){
var stanzas = require('../stanza/chatstates');


module.exports = function (client) {
    client.disco.addFeature('http://jabber.org/protocol/chatstates');

    client.on('message', function (msg) {
        if (msg.chatState) {
            client.emit('chatState', {
                to: msg.to,
                from: msg.from,
                chatState: msg.chatState
            });
        }
    });
};

},{"../stanza/chatstates":31}],9:[function(require,module,exports){
module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:message-correct:0');

    client.on('message', function (msg) {
        if (msg.replace) {
            client.emit('replace', msg);
            client.emit('replace:' + msg.id, msg);
        }
    });
};

},{}],10:[function(require,module,exports){
var stanzas = require('../stanza/delayed');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:delay');
};

},{"../stanza/delayed":33}],11:[function(require,module,exports){
/*global unescape, escape */

var _ = require('underscore');
var crypto = require('crypto');

require('../stanza/disco');
require('../stanza/caps');


var UTF8 = {
    encode: function (s) {
        return unescape(encodeURIComponent(s));
    },
    decode: function (s) {
        return decodeURIComponent(escape(s));
    }
};


function verifyVerString(info, hash, check) {
    if (hash === 'sha-1') {
        hash = 'sha1';
    }
    var computed = generateVerString(info, hash);
    return computed && computed == check;
}


function generateVerString(info, hash) {
    var S = '';
    var features = info.features.sort();
    var identities = [];
    var formTypes = {};
    var formOrder = [];

    
    _.forEach(info.identities, function (identity) {
        identities.push([
            identity.category || '',
            identity.type || '',
            identity.lang || '',
            identity.name || ''
        ].join('/'));
    });

    var idLen = identities.length;
    var featureLen = features.length;

    identities = _.unique(identities, true);
    features = _.unique(features, true);

    if (featureLen != features.length || idLen != identities.length) {
        return false;
    }


    S += identities.join('<') + '<';
    S += features.join('<') + '<';


    var illFormed = false;
    _.forEach(info.extensions, function (ext) {
        var fields = ext.fields;
        for (var i = 0, len = fields.length; i < len; i++) {
            if (fields[i].name == 'FORM_TYPE' && fields[i].type == 'hidden') {
                var name = fields[i].value;
                if (formTypes[name]) {
                    illFormed = true;
                    return;
                }
                formTypes[name] = ext;
                formOrder.push(name);
                return;
            }
        }
    });
    if (illFormed) {
        return false;
    }

    formOrder.sort();

    _.forEach(formOrder, function (name) {
        var ext = formTypes[name];
        var fields = {};
        var fieldOrder = [];

        S += '<' + name;
       
        _.forEach(ext.fields, function (field) {
            var fieldName = field.name;
            if (fieldName != 'FORM_TYPE') {
                var values = field.value || '';
                if (typeof values != 'object') {
                    values = values.split('\n');
                }
                fields[fieldName] = values.sort();
                fieldOrder.push(fieldName);
            }
        });

        fieldOrder.sort();
       
        _.forEach(fieldOrder, function (fieldName) {
            S += '<' + fieldName;
            _.forEach(fields[fieldName], function (val) {
                S += '<' + val;
            });
        });
    });

    if (hash === 'sha-1') {
        hash = 'sha1';
    }

    var ver = crypto.createHash(hash).update(UTF8.encode(S)).digest('base64');
    var padding = 4 - ver.length % 4;
    if (padding === 4) {
        padding = 0;
    }

    for (var i = 0; i < padding; i++) {
        ver += '=';
    }
    return ver;
}


function Disco(client) {
    this.features = {};
    this.identities = {};
    this.extensions = {};
    this.items = {};
    this.caps = {};
}

Disco.prototype = {
    constructor: {
        value: Disco
    },
    addFeature: function (feature, node) {
        node = node || ''; 
        if (!this.features[node]) {
            this.features[node] = [];
        }
        this.features[node].push(feature);
    },
    addIdentity: function (identity, node) {
        node = node || ''; 
        if (!this.identities[node]) {
            this.identities[node] = [];
        }
        this.identities[node].push(identity);
    },
    addItem: function (item, node) {
        node = node || ''; 
        if (!this.items[node]) {
            this.items[node] = [];
        }
        this.items[node].push(item);
    },
    addExtension: function (form, node) {
        node = node || ''; 
        if (!this.extensions[node]) {
            this.extensions[node] = [];
        }
        this.extensions[node].push(form);
    }
};

module.exports = function (client) {
    client.disco = new Disco(client);

    client.disco.addFeature('http://jabber.org/protocol/disco#info');
    client.disco.addIdentity({
        category: 'client',
        type: 'web'
    });

    client.getDiscoInfo = function (jid, node, cb) {
        this.sendIq({
            to: jid,
            type: 'get',
            discoInfo: {
                node: node
            }
        }, cb);
    };

    client.getDiscoItems = function (jid, node, cb) {
        this.sendIq({
            to: jid,
            type: 'get',
            discoItems: {
                node: node
            }
        }, cb);
    };

    client.updateCaps = function () {
        var node = this.config.capsNode || 'https://stanza.io';
        var data = JSON.parse(JSON.stringify({
            identities: this.disco.identities[''],
            features: this.disco.features[''],
            extensions: this.disco.extensions['']
        }));

        var ver = generateVerString(data, 'sha-1');

        this.disco.caps = {
            node: node,
            hash: 'sha-1',
            ver: ver
        };

        node = node + '#' + ver;
        this.disco.features[node] = data.features;
        this.disco.identities[node] = data.identities;
        this.disco.extensions[node] = data.extensions;

        return client.getCurrentCaps();
    };

    client.getCurrentCaps = function () {
        var caps = client.disco.caps;
        if (!caps.ver) {
            return {ver: null, discoInfo: null};
        }

        var node = caps.node + '#' + caps.ver;
        return {
            ver: caps.ver,
            discoInfo: {
                identities: client.disco.identities[node],
                features: client.disco.features[node],
                extensions: client.disco.extensions[node]
            }
        };
    };

    client.on('presence', function (pres) {
        if (pres._extensions.caps) {
            client.emit('disco:caps', pres);
        }
    });

    client.on('iq:get:discoInfo', function (iq) {
        var node = iq.discoInfo.node;
        var reportedNode = iq.discoInfo.node;

        if (node === client.disco.caps.node + '#' + client.disco.caps.ver) {
            reportedNode = node;
            node = '';
        }
        client.sendIq(iq.resultReply({
            discoInfo: {
                node: reportedNode,
                identities: client.disco.identities[node] || [],
                features: client.disco.features[node] || [],
                extensions: client.disco.extensions[node] || []
            }
        }));
    });

    client.on('iq:get:discoItems', function (iq) {
        var node = iq.discoInfo.node;
        client.sendIq(iq.resultReply({
            discoItems: {
                node: node,
                items: client.disco.items[node] || []
            }
        }));
    });

    client.verifyVerString = verifyVerString;
    client.generateVerString = generateVerString;
};

},{"../stanza/caps":29,"../stanza/disco":34,"crypto":72,"underscore":119}],12:[function(require,module,exports){
var stanzas = require('../stanza/forwarded');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:forward:0');
};

},{"../stanza/forwarded":36}],13:[function(require,module,exports){
module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:hashes:1');
    client.disco.addFeature('urn:xmpp:hash-function-text-names:md5');
    client.disco.addFeature('urn:xmpp:hash-function-text-names:sha-1');
    client.disco.addFeature('urn:xmpp:hash-function-text-names:sha-256');
};

},{}],14:[function(require,module,exports){
module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:idle:0');
};

},{}],15:[function(require,module,exports){
require('../stanza/visibility');


module.exports = function (client) {
    client.goInvisible = function (cb) {
        this.sendIq({
            type: 'set',
            invisible: true
        });
    };

    client.goVisible = function (cb) {
        this.sendIq({
            type: 'set',
            visible: true
        });
    };
};

},{"../stanza/visibility":60}],16:[function(require,module,exports){
var Jingle = require('jingle');

var stanza = require('../stanza/jingle');
var rtp = require('../stanza/rtp');
var ice = require('../stanza/iceUdp');


module.exports = function (client) {
    var jingle = client.jingle = new Jingle();

    jingle.capabilities.forEach(function (cap) {
        client.disco.addFeature(cap);
    });

    var mappedEvents = [
        'outgoing', 'incoming', 'accepted', 'terminated',
        'ringing', 'mute', 'unmute', 'hold', 'resumed'
    ];
    mappedEvents.forEach(function (event) {
        jingle.on(event, function (session, arg1) {
            client.emit('jingle:' + event, session, arg1);
        });
    });

    jingle.on('localStream', function (stream) {
        client.emit('jingle:localstream:added', stream);
    });

    jingle.on('localStreamStopped', function () {
        client.emit('jingle:localstream:removed');
    });

    jingle.on('peerStreamAdded', function (session) {
        client.emit('jingle:remotestream:added', session);
    });

    jingle.on('peerStreamRemoved', function (session) {
        client.emit('jingle:remotestream:removed', session);
    });

    jingle.on('send', function (data) {
        client.sendIq(data);
    });

    client.on('iq:set:jingle', function (data) {
        data = data.toJSON();
        jingle.process(data);
    });

    client.on('unavailable', function (pres) {
        var peer = pres.from.full;
        jingle.endPeerSessions(peer);
    });

    client.call = function (peer) {
        peer = peer.full || peer;
        var sess = jingle.createMediaSession(peer);
        client.sendPresence({to: peer});
        sess.start();
        return sess;
    };
};

},{"../stanza/iceUdp":37,"../stanza/jingle":39,"../stanza/rtp":50,"jingle":80}],17:[function(require,module,exports){
var stanza = require('../stanza/json');

module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:json:tmp');
};

},{"../stanza/json":40}],18:[function(require,module,exports){
var stanzas = require('../stanza/mam');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:mam:tmp');

    client.getHistory = function (opts, cb) {
        var self = this;
        var queryid = this.nextId();

        opts = opts || {};
        opts.queryid = queryid;

        var mamResults = [];
        this.on('mam:' + queryid, 'session', function (msg) {
            mamResults.push(msg);
        });

        cb = cb || function () {};

        this.sendIq({
            type: 'get',
            id: queryid,
            mamQuery: opts
        }, function (err, resp) {
            if (err) {
                cb(err);
            } else {
                self.off('mam:' + queryid);
                resp.mamQuery.results = mamResults;
                cb(null, resp);
            }
        });
    };

    client.getHistoryPreferences = function (cb) {
        client.sendIq({
            type: 'get',
            mamPrefs: {}
        }, cb);
    };

    client.setHistoryPreferences = function (opts, cb) {
        client.sendIq({
            type: 'set',
            mamPrefs: opts
        }, cb);
    };

    client.on('message', function (msg) {
        if (msg._extensions.mam) {
            client.emit('mam:' + msg.mam.queryid, msg);
        }
    });
};

},{"../stanza/mam":41}],19:[function(require,module,exports){
require('../stanza/muc');


module.exports = function (client) {
    client.joinRoom = function (room, nick, opts) {
        opts = opts || {};
        opts.to = room + '/' + nick;
        opts.caps = this.disco.caps;
        opts.joinMuc = opts.joinMuc || {};

        this.sendPresence(opts);
    };

    client.leaveRoom = function (room, nick, opts) {
        opts = opts || {};
        opts.to = room + '/' + nick;
        opts.type = 'unavailable';
        this.sendPresence(opts);
    };
};

},{"../stanza/muc":43}],20:[function(require,module,exports){
var stanzas = require('../stanza/private');


module.exports = function (client) {

    client.getPrivateData = function (opts, cb) {
        this.sendIq({
            type: 'get',
            privateStorage: opts
        }, cb);
    };

    client.setPrivateData = function (opts, cb) {
        this.sendIq({
            type: 'set',
            privateStorage: opts
        }, cb);
    };

};

},{"../stanza/private":45}],21:[function(require,module,exports){
var stanzas = require('../stanza/pubsub');


module.exports = function (client) {

    client.on('message', function (msg) {
        if (msg._extensions.event) {
            client.emit('pubsubEvent', msg);
        }
    });

    client.subscribeToNode = function (jid, opts, cb) {
        client.sendIq({
            type: 'set',
            to: jid,
            pubsub: {
                subscribe: {
                    node: opts.node,
                    jid: opts.jid || client.jid
                }
            }
        }, cb);
    };

    client.unsubscribeFromNode = function (jid, opts, cb) {
        client.sendIq({
            type: 'set',
            to: jid,
            pubsub: {
                unsubscribe: {
                    node: opts.node,
                    jid: opts.jid || client.jid.split('/')[0]
                }
            }
        }, cb);
    };

    client.publish = function (jid, node, item, cb) {
        client.sendIq({
            type: 'set',
            to: jid,
            pubsub: {
                publish: {
                    node: node,
                    item: item
                }
            }
        }, cb);
    };

    client.getItem = function (jid, node, id, cb) {
        client.sendIq({
            type: 'get',
            to: jid,
            pubsub: {
                retrieve: {
                    node: node,
                    item: id
                }
            }
        }, cb);
    };

    client.getItems = function (jid, node, opts, cb) {
        opts = opts || {};
        opts.node = node;
        client.sendIq({
            type: 'get',
            to: jid,
            pubsub: {
                retrieve: {
                    node: node,
                    max: opts.max 
                },
                rsm: opts.rsm
            }
        }, cb);
    };

    client.retract = function (jid, node, id, notify, cb) {
        client.sendIq({
            type: 'set',
            to: jid,
            pubsub: {
                retract: {
                    node: node,
                    notify: notify,
                    id: id
                }
            }
        }, cb);
    };

    client.purgeNode = function (jid, node, cb) {
        client.sendIq({
            type: 'set',
            to: jid,
            pubsubOwner: {
                purge: node
            }
        }, cb);
    };

    client.deleteNode = function (jid, node, cb) {
        client.sendIq({
            type: 'set',
            to: jid,
            pubsubOwner: {
                del: node
            }
        }, cb);
    };

    client.createNode = function (jid, node, config, cb) {
        var cmd = {
            type: 'set',
            to: jid,
            pubsubOwner: {
                create: node
            }
        };
        
        if (config) {
            cmd.pubsubOwner.config = {form: config};
        }

        client.sendIq(cmd, cb);
    };
};

},{"../stanza/pubsub":46}],22:[function(require,module,exports){
var stanzas = require('../stanza/receipts');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:receipts');

    client.on('message', function (msg) {
        var ackTypes = {
            normal: true,
            chat: true,
            headline: true
        };
        if (ackTypes[msg.type] && msg.requestReceipt && !msg._extensions.receipt) {
            client.sendMessage({
                to: msg.from,
                receipt: {
                    id: msg.id
                },
                id: msg.id
            });
        }
        if (msg._extensions.receipt) {
            client.emit('receipt:' + msg.receipt.id);
        }
    });
};

},{"../stanza/receipts":47}],23:[function(require,module,exports){
var stanzas = require('../stanza/time');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:time');

    client.getTime = function (jid, cb) {
        this.sendIq({
            to: jid,
            type: 'get',
            time: true
        }, cb);
    };

    client.on('iq:get:time', function (iq) {
        var time = new Date();
        client.sendIq(iq.resultReply({
            time: {
                utc: time,
                tzo: time.getTimezoneOffset()
            }
        }));
    });
};

},{"../stanza/time":57}],24:[function(require,module,exports){
require('../stanza/version');


module.exports = function (client) {
    client.disco.addFeature('jabber:iq:version');

    client.on('iq:get:version', function (iq) {
        client.sendIq(iq.resultReply({
            version: client.config.version || {
                name: 'stanza.io'
            }
        }));
    });

    client.getSoftwareVersion = function (jid, cb) {
        this.sendIq({
            to: jid,
            type: 'get',
            version: {}
        }, cb);
    };
};

},{"../stanza/version":59}],25:[function(require,module,exports){
var SM = require('./stanza/sm');
var MAX_SEQ = Math.pow(2, 32);


function mod(v, n) {
    return ((v % n) + n) % n;
}


function StreamManagement(conn) {
    this.conn = conn;
    this.id = false;
    this.allowResume = true;
    this.started = false;
    this.lastAck = 0;
    this.handled = 0;
    this.windowSize = 1;
    this.unacked = [];
    this.pendingAck = false;
}

StreamManagement.prototype = {
    constructor: {
        value: StreamManagement
    },
    enable: function () {
        var enable = new SM.Enable();
        enable.resume = this.allowResume;
        this.conn.send(enable);
        this.handled = 0;
        this.started = true;
    },
    resume: function () {
        var resume = new SM.Resume({
            h: this.handled,
            previd: this.id
        });
        this.conn.send(resume);
        this.started = true;
    },
    enabled: function (resp) {
        this.id = resp.id;
    },
    resumed: function (resp) {
        this.id = resp.id;
        if (resp.h) {
            this.process(resp, true);
        }
    },
    failed: function (resp) {
        this.started = false;
        this.id = false;
        this.lastAck = 0;
        this.handled = 0;
        this.unacked = [];
    },
    ack: function () {
        this.conn.send(new SM.Ack({
            h: this.handled
        }));
    },
    request: function () {
        this.pendingAck = true;
        this.conn.send(new SM.Request());
    },
    process: function (ack, resend) {
        var self = this;
        var numAcked = mod(ack.h - this.lastAck, MAX_SEQ);

        this.pendingAck = false;

        for (var i = 0; i < numAcked && this.unacked.length > 0; i++) {
            this.conn.emit('stanza:acked', this.unacked.shift());
        }
        this.lastAck = ack.h;

        if (resend) {
            var resendUnacked = this.unacked;
            this.unacked = [];
            resendUnacked.forEach(function (stanza) {
                self.conn.send(stanza);
            });
        }

        if (this.unacked.length >= this.windowSize) {
            this.request();
        }
    },
    track: function (stanza) {
        var name = stanza._name;
        var acceptable = {
            message: true,
            presence: true,
            iq: true
        };

        if (this.started && acceptable[name]) {
            this.unacked.push(stanza);
            if (!this.pendingAck && this.unacked.length >= this.windowSize) {
                this.request();
            }
        }
    },
    handle: function (stanza) {
        if (this.started) {
            this.handled = mod(this.handled + 1, MAX_SEQ);
        }
    }
};

module.exports = StreamManagement;

},{"./stanza/sm":53}],26:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var Item = require('./pubsub').Item;
var EventItem = require('./pubsub').EventItem;

var Avatar = module.exports = stanza.define({
    name: 'avatar',
    namespace: 'urn:xmpp:avatar:metadata',
    element: 'info',
    fields: {
        id: stanza.attribute('id'),
        bytes: stanza.attribute('bytes'),
        height: stanza.attribute('height'),
        width: stanza.attribute('width'),
        type: stanza.attribute('type', 'image/png'),
        url: stanza.attribute('url')
    }
});


var avatars = {
    get: function () {
        var metadata = stanza.find(this.xml, 'urn:xmpp:avatar:metadata', 'metadata');
        var results = [];
        if (metadata.length) {
            var avatars = stanza.find(metadata[0], 'urn:xmpp:avatar:metadata', 'info');
            _.forEach(avatars, function (info) {
                results.push(new Avatar({}, info));
            });
        }
        return results;
    },
    set: function (value) {
        var metadata = stanza.findOrCreate(this.xml, 'urn:xmpp:avatar:metadata', 'metadata');
        stanza.setAttribute(metadata, 'xmlns', 'urn:xmpp:avatar:metadata');
        _.forEach(value, function (info) {
            var avatar = new Avatar(info);
            metadata.appendChild(avatar.xml);
        });
    }
};

stanza.add(Item, 'avatars', avatars);
stanza.add(EventItem, 'avatars', avatars);
stanza.add(Item, 'avatarData', stanza.subText('urn:xmpp:avatar:data', 'data'));
stanza.add(EventItem, 'avatarData', stanza.subText('urn:xmpp:avatar:data', 'data'));

},{"./pubsub":46,"jxt":98,"underscore":119}],27:[function(require,module,exports){
var stanza = require('jxt');
var Iq = require('./iq');
var StreamFeatures = require('./streamFeatures');
var util = require('./util');

var NS = 'urn:ietf:params:xml:ns:xmpp-bind';

var Bind = module.exports = stanza.define({
    name: 'bind',
    namespace: NS,
    element: 'bind',
    fields: {
        resource: stanza.subText(NS, 'resource'),
        jid: util.jidSub(NS, 'jid')
    }
});

stanza.extend(Iq, Bind);
stanza.extend(StreamFeatures, Bind);

},{"./iq":38,"./streamFeatures":56,"./util":58,"jxt":98}],28:[function(require,module,exports){
var stanza = require('jxt');
var util = require('./util');
var PrivateStorage = require('./private');


var Conference = stanza.define({
    name: 'conference',
    namespace: 'storage:bookmarks',
    element: 'conference',
    fields: {
        name: stanza.attribute('name'),
        autoJoin: stanza.boolAttribute('autojoin'),
        jid: util.jidAttribute('jid'),
        nick: stanza.subText('storage:bookmarks', 'nick')
    }
});

var Bookmarks = module.exports = stanza.define({
    name: 'bookmarks',
    namespace: 'storage:bookmarks',
    element: 'storage'
});


stanza.extend(PrivateStorage, Bookmarks);
stanza.extend(Bookmarks, Conference, 'conferences');

},{"./private":45,"./util":58,"jxt":98}],29:[function(require,module,exports){
var stanza = require('jxt');
var Presence = require('./presence');
var StreamFeatures = require('./streamFeatures');


var Caps = module.exports = stanza.define({
    name: 'caps',
    namespace: 'http://jabber.org/protocol/caps',
    element: 'c',
    fields: {
        ver: stanza.attribute('ver'),
        node: stanza.attribute('node'),
        hash: stanza.attribute('hash'),
        ext: stanza.attribute('ext')
    }
});

stanza.extend(Presence, Caps);
stanza.extend(StreamFeatures, Caps);

},{"./presence":44,"./streamFeatures":56,"jxt":98}],30:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');
var Iq = require('./iq');
var Forwarded = require('./forwarded');


exports.Sent = stanza.define({
    name: 'carbonSent',
    eventName: 'carbon:sent',
    namespace: 'urn:xmpp:carbons:2',
    element: 'sent'
});

exports.Received = stanza.define({
    name: 'carbonReceived',
    eventName: 'carbon:received',
    namespace: 'urn:xmpp:carbons:2',
    element: 'received'
});

exports.Private = stanza.define({
    name: 'carbonPrivate',
    eventName: 'carbon:private',
    namespace: 'urn:xmpp:carbons:2',
    element: 'private'
});

exports.Enable = stanza.define({
    name: 'enableCarbons',
    namespace: 'urn:xmpp:carbons:2',
    element: 'enable'
});

exports.Disable = stanza.define({
    name: 'disableCarbons',
    namespace: 'urn:xmpp:carbons:2',
    element: 'disable'
});


stanza.extend(exports.Sent, Forwarded);
stanza.extend(exports.Received, Forwarded);
stanza.extend(Message, exports.Sent);
stanza.extend(Message, exports.Received);
stanza.extend(Message, exports.Private);
stanza.extend(Iq, exports.Enable);
stanza.extend(Iq, exports.Disable);

},{"./forwarded":36,"./iq":38,"./message":42,"jxt":98}],31:[function(require,module,exports){
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
            this['chatState' + value.charAt(0).toUpperCase() + value.slice(1)];
        }
    }
});

},{"./message":42,"jxt":98}],32:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var Message = require('./message');


exports.DataForm = stanza.define({
    name: 'form',
    namespace: 'jabber:x:data',
    element: 'x',
    fields: {
        title: stanza.subText('jabber:x:data', 'title'),
        instructions: stanza.multiSubText('jabber:x:data', 'instructions'),
        type: stanza.attribute('type', 'form')
    }
});

exports.Field = stanza.define({
    name: 'field',
    namespace: 'jabber:x:data',
    element: 'field',
    init: function (data) {
        this._type = data.type || this.type;
    },
    fields: {
        type: {
            get: function () {
                return stanza.getAttribute(this.xml, 'type', 'text-single');
            },
            set: function (value) {
                this._type = value;
                stanza.setAttribute(this.xml, 'type', value);
            }
        },
        name: stanza.attribute('var'),
        desc: stanza.subText('desc'),
        required: stanza.boolSub('jabber:x:data', 'required'),
        label: stanza.attribute('label'),
        value: {
            get: function () {
                var vals = stanza.getMultiSubText(this.xml, this._NS, 'value');
                if (this._type === 'boolean') {
                    return vals[0] === '1' || vals[0] === 'true';
                }
                if (vals.length > 1) {
                    if (this._type === 'text-multi') {
                        return vals.join('\n');
                    }
                    return vals;
                }
                return vals[0];
            },
            set: function (value) {
                if (this._type === 'boolean') {
                    stanza.setSubText(this.xml, this._NS, 'value', value ? '1' : '0');
                } else {
                    if (this._type === 'text-multi') {
                        value = value.split('\n');
                    }
                    stanza.setMultiSubText(this.xml, this._NS, 'value', value);
                }
            }
        },
        options: {
            get: function () {
                var self = this;
                return stanza.getMultiSubText(this.xml, this._NS, 'option', function (sub) {
                    return stanza.getSubText(sub, self._NS, 'value');
                });
            },
            set: function (value) {
                var self = this;
                stanza.setMultiSubText(this.xml, this._NS, 'option', value, function (val) {
                    var opt = document.createElementNS(self._NS, 'option');
                    var value = document.createElementNS(self._NS, 'value');

                    opt.appendChild(value);
                    value.textContent = val;
                    self.xml.appendChild(opt);
                });
            }
        }
    }
});


stanza.extend(Message, exports.DataForm);

},{"./message":42,"./util":58,"jxt":98,"underscore":119}],33:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var util = require('./util');

var DelayedDelivery = module.exports = stanza.define({
    name: 'delay',
    namespace: 'urn:xmpp:delay',
    element: 'delay',
    fields: {
        from: util.jidAttribute('from'),
        stamp: stanza.dateAttribute('stamp'),
        reason: stanza.text()
    }
});

stanza.extend(Message, DelayedDelivery);
stanza.extend(Presence, DelayedDelivery);

},{"./message":42,"./presence":44,"./util":58,"jxt":98}],34:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var JID = require('../jid');
var Iq = require('./iq');
var RSM = require('./rsm');
var DataForm = require('./dataforms').DataForm;


exports.DiscoInfo = stanza.define({
    name: 'discoInfo',
    namespace: 'http://jabber.org/protocol/disco#info',
    element: 'query',
    fields: {
        node: stanza.attribute('node'),
        identities: {
            get: function () {
                var result = [];
                var identities = stanza.find(this.xml, this._NS, 'identity');
                identities.forEach(function (identity) {
                    result.push({
                        category: stanza.getAttribute(identity, 'category'),
                        type: stanza.getAttribute(identity, 'type'),
                        lang: identity.getAttributeNS(stanza.XML_NS, 'lang'),
                        name: stanza.getAttribute(identity, 'name')
                    });
                });
                return result;
            },
            set: function (values) {
                var self = this;

                var existing = stanza.find(this.xml, this._NS, 'identity');
                existing.forEach(function (item) {
                    self.xml.removeChild(item);
                });
                values.forEach(function (value) {
                    var identity = document.createElementNS(self._NS, 'identity');
                    stanza.setAttribute(identity, 'category', value.category);
                    stanza.setAttribute(identity, 'type', value.type);
                    stanza.setAttribute(identity, 'name', value.name);
                    if (value.lang) {
                        identity.setAttributeNS(stanza.XML_NS, 'lang', value.lang);
                    }
                    self.xml.appendChild(identity);
                });
            }
        },
        features: {
            get: function () {
                var result = [];
                var features = stanza.find(this.xml, this._NS, 'feature');
                features.forEach(function (feature) {
                    result.push(feature.getAttribute('var'));
                });
                return result;
            },
            set: function (values) {
                var self = this;

                var existing = stanza.find(this.xml, this._NS, 'feature');
                existing.forEach(function (item) {
                    self.xml.removeChild(item);
                });
                values.forEach(function (value) {
                    var feature = document.createElementNS(self._NS, 'feature');
                    feature.setAttribute('var', value);
                    self.xml.appendChild(feature);
                });
            }
        }
    }
});


exports.DiscoItems = stanza.define({
    name: 'discoItems',
    namespace: 'http://jabber.org/protocol/disco#items',
    element: 'query',
    fields: {
        node: stanza.attribute('node'),
        items: {
            get: function () {
                var result = [];
                var items = stanza.find(this.xml, this._NS, 'item');
                items.forEach(function (item) {
                    result.push({
                        jid: new JID(stanza.getAttribute(item, 'jid')),
                        node: stanza.getAttribute(item, 'node'),
                        name: stanza.getAttribute(item, 'name')
                    });
                });
                return result;
            },
            set: function (values) {
                var self = this;
                var existing = stanza.find(this.xml, this._NS, 'item');

                existing.forEach(function (item) {
                    self.xml.removeChild(item);
                });
                values.forEach(function (value) {
                    var item = document.createElementNS(self._NS, 'item');
                    stanza.setAttribute(item, 'jid', value.jid.toString());
                    stanza.setAttribute(item, 'node', value.node);
                    stanza.setAttribute(item, 'name', value.name);
                    self.xml.appendChild(item);
                });
            }
        }
    }
});


stanza.extend(Iq, exports.DiscoInfo);
stanza.extend(Iq, exports.DiscoItems);
stanza.extend(exports.DiscoItems, RSM);
stanza.extend(exports.DiscoInfo, DataForm, 'extensions');

},{"../jid":3,"./dataforms":32,"./iq":38,"./rsm":49,"jxt":98,"underscore":119}],35:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');


var ERR_NS = 'urn:ietf:params:xml:ns:xmpp-stanzas';
var CONDITIONS = [
    'bad-request', 'conflict', 'feature-not-implemented',
    'forbidden', 'gone', 'internal-server-error',
    'item-not-found', 'jid-malformed', 'not-acceptable',
    'not-allowed', 'not-authorized', 'payment-required',
    'recipient-unavailable', 'redirect',
    'registration-required', 'remote-server-not-found',
    'remote-server-timeout', 'resource-constraint',
    'service-unavailable', 'subscription-required',
    'undefined-condition', 'unexpected-request'
];


var ErrorStanza = module.exports = stanza.define({
    name: 'error',
    namespace: 'jabber:client',
    element: 'error',
    fields: {
        lang: {
            get: function () {
                return (this.parent || {}).lang || '';
            }
        },
        condition: {
            get: function () {
                var self = this;
                var result = [];
                CONDITIONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, ERR_NS, condition);
                    if (exists.length) {
                        result.push(exists[0].tagName);
                    }
                });
                return result[0] || '';
            },
            set: function (value) {
                var self = this;
                CONDITIONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, ERR_NS, condition);
                    if (exists.length) {
                        self.xml.removeChild(exists[0]);
                    }
                });

                if (value) {
                    var condition = document.createElementNS(ERR_NS, value);
                    condition.setAttribute('xmlns', ERR_NS);
                    this.xml.appendChild(condition);
                }
            }
        },
        gone: {
            get: function () {
                return stanza.getSubText(this.xml, ERR_NS, 'gone');
            },
            set: function (value) {
                this.condition = 'gone';
                stanza.setSubText(this.xml, ERR_NS, 'gone', value);
            }
        },
        redirect: {
            get: function () {
                return stanza.getSubText(this.xml, ERR_NS, 'redirect');
            },
            set: function (value) {
                this.condition = 'redirect';
                stanza.setSubText(this.xml, ERR_NS, 'redirect', value);
            }
        },
        code: stanza.attribute('code'),
        type: stanza.attribute('type'),
        by: util.jidAttribute('by'),
        $text: {
            get: function () {
                return stanza.getSubLangText(this.xml, ERR_NS, 'text', this.lang);
            }
        },
        text: {
            get: function () {
                var text = this.$text;
                return text[this.lang] || '';
            },
            set: function (value) {
                stanza.setSubLangText(this.xml, ERR_NS, 'text', value, this.lang);
            }
        }
    }
});


stanza.extend(Message, ErrorStanza);
stanza.extend(Presence, ErrorStanza);
stanza.extend(Iq, ErrorStanza);

},{"./iq":38,"./message":42,"./presence":44,"./util":58,"jxt":98,"underscore":119}],36:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');
var DelayedDelivery = require('./delayed');


var Forwarded = module.exports = stanza.define({
    name: 'forwarded',
    eventName: 'forward',
    namespace: 'urn:xmpp:forward:0',
    element: 'forwarded'
});


stanza.extend(Message, Forwarded);
stanza.extend(Forwarded, Message);
stanza.extend(Forwarded, Presence);
stanza.extend(Forwarded, Iq);
stanza.extend(Forwarded, DelayedDelivery);

},{"./delayed":33,"./iq":38,"./message":42,"./presence":44,"jxt":98}],37:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var jingle = require('./jingle');


var NS = 'urn:xmpp:jingle:transports:ice-udp:1';


exports.ICEUDP = stanza.define({
    name: '_iceUdp',
    namespace: NS,
    element: 'transport',
    fields: {
        transType: {value: 'iceUdp'},
        pwd: stanza.attribute('pwd'),
        ufrag: stanza.attribute('ufrag')
    }
});


exports.RemoteCandidate = stanza.define({
    name: 'remoteCandidate',
    namespace: NS,
    element: 'remote-candidate',
    fields: {
        component: stanza.attribute('component'),
        ip: stanza.attribute('ip'),
        port: stanza.attribute('port')
    }
});


exports.Candidate = stanza.define({
    name: '_iceUdpCandidate',
    namespace: NS,
    element: 'candidate',
    fields: {
        component: stanza.attribute('component'),
        foundation: stanza.attribute('foundation'),
        generation: stanza.attribute('generation'),
        id: stanza.attribute('id'),
        ip: stanza.attribute('ip'),
        network: stanza.attribute('network'),
        port: stanza.attribute('port'),
        priority: stanza.attribute('priority'),
        protocol: stanza.attribute('protocol'),
        relAddr: stanza.attribute('rel-addr'),
        relPort: stanza.attribute('rel-port'),
        type: stanza.attribute('type')
    }
});


exports.Fingerprint = stanza.define({
    name: '_iceFingerprint',
    namespace: 'urn:xmpp:tmp:jingle:apps:dtls:0',
    element: 'fingerprint',
    fields: {
        hash: stanza.attribute('hash'),
        value: stanza.text(),
        required: stanza.boolAttribute('required')
    }
});


stanza.extend(jingle.Content, exports.ICEUDP);
stanza.extend(exports.ICEUDP, exports.Candidate, 'candidates');
stanza.extend(exports.ICEUDP, exports.RemoteCandidate);
stanza.extend(exports.ICEUDP, exports.Fingerprint, 'fingerprints');

},{"./jingle":39,"./util":58,"jxt":98,"underscore":119}],38:[function(require,module,exports){
var stanza = require('jxt');
var util = require('./util');


var Iq = module.exports = stanza.define({
    name: 'iq',
    namespace: 'jabber:client',
    element: 'iq',
    topLevel: true,
    fields: {
        lang: stanza.langAttribute(),
        id: stanza.attribute('id'),
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from'),
        type: stanza.attribute('type')
    }
});

Iq.prototype.resultReply = function (data) {
    data.to = this.from;
    data.id = this.id;
    data.type = 'result';
    return new Iq(data);
};

Iq.prototype.errorReply = function (data) {
    data.to = this.from;
    data.id = this.id;
    data.type = 'error';
    return new Iq(data);
};

},{"./util":58,"jxt":98}],39:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var Iq = require('./iq');
var ErrorStanza = require('./error');


var NS = 'urn:xmpp:jingle:1';
var ERRNS = 'urn:xmpp:jingle:errors:1';
var CONDITIONS = ['out-of-order', 'tie-break', 'unknown-session', 'unsupported-info'];
var REASONS = [
    'alternative-session', 'busy', 'cancel', 'connectivity-error',
    'decline', 'expired', 'failed-application', 'failed-transport',
    'general-error', 'gone', 'incompatible-parameters', 'media-error',
    'security-error', 'success', 'timeout', 'unsupported-applications',
    'unsupported-transports'
];


exports.Jingle = stanza.define({
    name: 'jingle',
    namespace: NS,
    element: 'jingle',
    fields: {
        action: stanza.attribute('action'),
        initiator: stanza.attribute('initiator'),
        responder: stanza.attribute('responder'),
        sid: stanza.attribute('sid')
    }
});


exports.Content = stanza.define({
    name: '_jingleContent',
    namespace: NS,
    element: 'content',
    fields: {
        creator: stanza.attribute('creator'),
        disposition: stanza.attribute('disposition', 'session'),
        name: stanza.attribute('name'),
        senders: stanza.attribute('senders', 'both'),
        description: {
            get: function () {
                var opts = ['_rtp'];
                for (var i = 0; i < opts.length; i++) {
                    if (this._extensions[opts[i]]) {
                        return this._extensions[opts[i]];
                    }
                }
            },
            set: function (value) {
                var ext = '_' + value.descType;
                this[ext] = value;
            }
        },
        transport: {
            get: function () {
                var opts = ['_iceUdp'];
                for (var i = 0; i < opts.length; i++) {
                    if (this._extensions[opts[i]]) {
                        return this._extensions[opts[i]];
                    }
                }
            },
            set: function (value) {
                var ext = '_' + value.transType;
                this[ext] = value;
            }
        }
    }
});

exports.Reason = stanza.define({
    name: 'reason',
    namespace: NS,
    element: 'reason',
    fields: {
        condition: {
            get: function () {
                var self = this;
                var result = [];
                REASONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, NS, condition);
                    if (exists.length) {
                        result.push(exists[0].tagName);
                    }
                });
                return result[0] || '';
            },
            set: function (value) {
                var self = this;
                REASONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, NS, condition);
                    if (exists.length) {
                        self.xml.removeChild(exists[0]);
                    }
                });

                if (value) {
                    var condition = document.createElementNS(NS, value);
                    this.xml.appendChild(condition);
                }
            }
        },
        alternativeSession: {
            get: function () {
                return stanza.getSubText(this.xml, NS, 'alternative-session');
            },
            set: function (value) {
                this.condition = 'alternative-session';
                stanza.setSubText(this.xml, NS, 'alternative-session', value);
            }
        },
        text: stanza.subText(NS, 'text')
    }
});


stanza.add(ErrorStanza, 'jingleCondition', {
    get: function () {
        var self = this;
        var result = [];
        CONDITIONS.forEach(function (condition) {
            var exists = stanza.find(self.xml, ERRNS, condition);
            if (exists.length) {
                result.push(exists[0].tagName);
            }
        });
        return result[0] || '';
    },
    set: function (value) {
        var self = this;
        CONDITIONS.forEach(function (condition) {
            var exists = stanza.find(self.xml, ERRNS, condition);
            if (exists.length) {
                self.xml.removeChild(exists[0]);
            }
        });

        if (value) {
            var condition = document.createElementNS(ERRNS, value);
            this.xml.appendChild(condition);
        }
    }
});


stanza.extend(Iq, exports.Jingle);
stanza.extend(exports.Jingle, exports.Content, 'contents');
stanza.extend(exports.Jingle, exports.Reason);

},{"./error":35,"./iq":38,"./util":58,"jxt":98,"underscore":119}],40:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');
var Item = require('./pubsub').Item;
var EventItem = require('./pubsub').EventItem;


var JSONExtension = module.exports = {
    get: function () {
        var data = stanza.getSubText(this.xml, 'urn:xmpp:json:0', 'json');
        if (data) {
            return JSON.parse(data);
        }
    },
    set: function (value) {
        value = JSON.stringify(value);
        if (value) {
            stanza.setSubText(this.xml, 'urn:xmpp:json:0', 'json', value);
        }
    }
};


stanza.add(Message, 'json', JSONExtension);
stanza.add(Item, 'json', JSONExtension);
stanza.add(EventItem, 'json', JSONExtension);

},{"./message":42,"./pubsub":46,"jxt":98}],41:[function(require,module,exports){
var stanza = require('jxt');
var util = require('./util');
var Message = require('./message');
var Iq = require('./iq');
var Forwarded = require('./forwarded');
var RSM = require('./rsm');
var JID = require('../jid');


exports.MAMQuery = stanza.define({
    name: 'mamQuery',
    namespace: 'urn:xmpp:mam:tmp',
    element: 'query',
    fields: {
        queryid: stanza.attribute('queryid'),
        start: stanza.dateSub('urn:xmpp:mam:tmp', 'start'),
        end: stanza.dateSub('urn:xmpp:mam:tmp', 'end'),
        'with': util.jidSub('urn:xmpp:mam:tmp', 'with')
    }
});

exports.Result = stanza.define({
    name: 'mam',
    eventName: 'mam:result',
    namespace: 'urn:xmpp:mam:tmp',
    element: 'result',
    fields: {
        queryid: stanza.attribute('queryid'),
        id: stanza.attribute('id')
    }
});

exports.Archived = stanza.define({
    name: 'mamArchived',
    namespace: 'urn:xmpp:mam:tmp',
    element: 'archived',
    fields: {
        by: util.jidAttribute('by'),
        id: stanza.attribute('id')
    }
});

exports.Prefs = stanza.define({
    name: 'mamPrefs',
    namespace: 'urn:xmpp:mam:tmp',
    element: 'prefs',
    fields: {
        defaultCondition: stanza.attribute('default'),
        always: {
            get: function () {
                var results = [];
                var container = stanza.find(this.xml, this._NS, 'always');
                if (container.length === 0) {
                    return results;
                }
                container = container[0];
                var jids = stanza.getMultiSubText(container, this._NS, 'jid');
                jids.forEach(function (jid) {
                    results.push(new JID(jid.textContent));
                });
                return results;
            },
            set: function (value) {
                if (value.length > 0) {
                    var container = stanza.find(this.xml, this._NS, 'always');
                    stanza.setMultiSubText(container, this._NS, 'jid', value);
                }
            }
        },
        never: {
            get: function () {
                var results = [];
                var container = stanza.find(this.xml, this._NS, 'always');
                if (container.length === 0) {
                    return results;
                }
                container = container[0];
                var jids = stanza.getMultiSubText(container, this._NS, 'jid');
                jids.forEach(function (jid) {
                    results.push(new JID(jid.textContent));
                });
                return results;
            },
            set: function (value) {
                if (value.length > 0) {
                    var container = stanza.find(this.xml, this._NS, 'never');
                    stanza.setMultiSubText(container, this._NS, 'jid', value);
                }
            }
        }
    }
});

stanza.extend(Message, exports.Archived, 'archived');
stanza.extend(Iq, exports.MAMQuery);
stanza.extend(Iq, exports.Prefs);
stanza.extend(Message, exports.Result);
stanza.extend(exports.Result, Forwarded);
stanza.extend(exports.MAMQuery, RSM);

},{"../jid":3,"./forwarded":36,"./iq":38,"./message":42,"./rsm":49,"./util":58,"jxt":98}],42:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');


module.exports = stanza.define({
    name: 'message',
    namespace: 'jabber:client',
    element: 'message',
    topLevel: true,
    fields: {
        lang: stanza.langAttribute(),
        id: stanza.attribute('id'),
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from'),
        type: stanza.attribute('type', 'normal'),
        thread: stanza.subText('jabber:client', 'thread'),
        parentThread: stanza.subAttribute('jabber:client', 'thread', 'parent'),
        $body: {
            get: function () {
                return stanza.getSubLangText(this.xml, this._NS, 'body', this.lang);
            }
        },
        body: {
            get: function () {
                var bodies = this.$body;
                return bodies[this.lang] || '';
            },
            set: function (value) {
                stanza.setSubLangText(this.xml, this._NS, 'body', value, this.lang);
            }
        },
        attention: stanza.boolSub('urn:xmpp:attention:0', 'attention'),
        replace: stanza.subAttribute('urn:xmpp:message-correct:0', 'replace', 'id')
    }
});

},{"./util":58,"jxt":98,"underscore":119}],43:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');


var NS = 'http://jabber.org/protocol/muc';


exports.MUCJoin = stanza.define({
    name: 'joinMuc',
    namespace: NS,
    element: 'x',
    fields: {
        password: stanza.subText(NS, 'password'),
        history: {
            get: function () {
                var result = {};
                var hist = stanza.find(this.xml, this._NS, 'history');

                if (!hist.length) {
                    return {};
                }
                hist = hist[0];

                var maxchars = hist.getAttribute('maxchars') || '';
                var maxstanzas = hist.getAttribute('maxstanas') || '';
                var seconds = hist.getAttribute('seconds') || '';
                var since = hist.getAttribute('since') || '';


                if (maxchars) {
                    result.maxchars = parseInt(maxchars, 10);
                }
                if (maxstanzas) {
                    result.maxstanzas = parseInt(maxstanzas, 10);
                }
                if (seconds) {
                    result.seconds = parseInt(seconds, 10);
                }
                if (since) {
                    result.since = new Date(since);
                }
            },
            set: function (opts) {
                var existing = stanza.find(this.xml, this._NS, 'history');
                if (existing.length) {
                    for (var i = 0; i < existing.length; i++) {
                        this.xml.removeChild(existing[i]);
                    }
                }

                var hist = document.createElementNS(this._NS, 'history');
                this.xml.appendChild(hist);

                if (opts.maxchars) {
                    hist.setAttribute('' + opts.maxchars);
                }
                if (opts.maxstanzas) {
                    hist.setAttribute('' + opts.maxstanzas);
                }
                if (opts.seconds) {
                    hist.setAttribute('' + opts.seconds);
                }
                if (opts.since) {
                    hist.setAttribute(opts.since.toISOString());
                }
            }
        }
    }
});


stanza.extend(Presence, exports.MUCJoin);

},{"./iq":38,"./message":42,"./presence":44,"jxt":98}],44:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');


module.exports = stanza.define({
    name: 'presence',
    namespace: 'jabber:client',
    element: 'presence',
    topLevel: true,
    fields: {
        lang: stanza.langAttribute(),
        id: stanza.attribute('id'),
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from'),
        priority: stanza.subText('jabber:client', 'priority', '0'),
        show: stanza.subText('jabber:client', 'show'),
        type: {
            get: function () {
                return stanza.getAttribute(this.xml, 'type', 'available');
            },
            set: function (value) {
                if (value === 'available') {
                    value = false;
                }
                stanza.setAttribute(this.xml, 'type', value);
            }
        },
        $status: {
            get: function () {
                return stanza.getSubLangText(this.xml, this._NS, 'status', this.lang);
            }
        },
        status: {
            get: function () {
                var statuses = this.$status;
                return statuses[this.lang] || '';
            },
            set: function (value) {
                stanza.setSubLangText(this.xml, this._NS, 'status', value, this.lang);
            }
        },
        idleSince: stanza.dateSubAttribute('urn:xmpp:idle:1', 'idle', 'since'),
        decloak: stanza.subAttribute('urn:xmpp:decloak:0', 'decloak', 'reason')
    }
});

},{"./util":58,"jxt":98,"underscore":119}],45:[function(require,module,exports){
var stanza = require('jxt');
var Iq = require('./iq');


var PrivateStorage = module.exports = stanza.define({
    name: 'privateStorage',
    namespace: 'jabber:iq:private',
    element: 'query'
});

stanza.extend(Iq, PrivateStorage);

},{"./iq":38,"jxt":98}],46:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var Iq = require('./iq');
var Message = require('./message');
var Form = require('./dataforms').DataForm;
var RSM = require('./rsm');
var JID = require('../jid');


var NS = 'http://jabber.org/protocol/pubsub';
var OwnerNS = 'http://jabber.org/protocol/pubsub#owner';
var EventNS = 'http://jabber.org/protocol/pubsub#event';


exports.Pubsub = stanza.define({
    name: 'pubsub',
    namespace: 'http://jabber.org/protocol/pubsub',
    element: 'pubsub',
    fields: {
        publishOptions: {
            get: function () {
                var conf = stanza.find(this.xml, this._NS, 'publish-options');
                if (conf.length && conf[0].childNodes.length) {
                    return new Form({}, conf[0].childNodes[0]);
                }
            },
            set: function (value) {
                var conf = stanza.findOrCreate(this.xml, this._NS, 'publish-options');
                if (value) {
                    var form = new Form(value);
                    conf.appendChild(form.xml);
                }
            }
        }
    }
});

exports.PubsubOwner = stanza.define({
    name: 'pubsubOwner',
    namespace: OwnerNS,
    element: 'pubsub',
    fields: {
        create: stanza.subAttribute(OwnerNS, 'create', 'node'),
        purge: stanza.subAttribute(OwnerNS, 'purge', 'node'),
        del: stanza.subAttribute(OwnerNS, 'delete', 'node'),
        redirect: {
            get: function () {
                var del = stanza.find(this.xml, this._NS, 'delete');
                if (del.length) {
                    return stanza.getSubAttribute(del[0], this._NS, 'redirect', 'uri');
                }
                return '';
            },
            set: function (value) {
                var del = stanza.findOrCreate(this.xml, this._NS, 'delete');
                stanza.setSubAttribute(del, this._NS, 'redirect', 'uri', value);
            }
        }
    }
});

exports.Configure = stanza.define({
    name: 'config',
    namespace: OwnerNS,
    element: 'configure',
    fields: {
        node: stanza.attribute('node')
    }
});

exports.Event = stanza.define({
    name: 'event',
    namespace: EventNS,
    element: 'event'
});

exports.Subscribe = stanza.define({
    name: 'subscribe',
    namespace: NS,
    element: 'subscribe',
    fields: {
        node: stanza.attribute('node'),
        jid: util.jidAttribute('jid')
    }
});

exports.Subscription = stanza.define({
    name: 'subscription',
    namespace: NS,
    element: 'subscription',
    fields: {
        node: stanza.attribute('node'),
        jid: util.jidAttribute('jid'),
        subid: stanza.attribute('subid'),
        type: stanza.attribute('subscription')
    }
});

exports.Unsubscribe = stanza.define({
    name: 'unsubscribe',
    namespace: NS,
    element: 'unsubscribe',
    fields: {
        node: stanza.attribute('node'),
        jid: util.jidAttribute('jid')
    }
});

exports.Publish = stanza.define({
    name: 'publish',
    namespace: NS,
    element: 'publish',
    fields: {
        node: stanza.attribute('node'),
    }
});

exports.Retract = stanza.define({
    name: 'retract',
    namespace: NS,
    element: 'retract',
    fields: {
        node: stanza.attribute('node'),
        notify: stanza.boolAttribute('notify'),
        id: stanza.subAttribute(NS, 'item', 'id')
    }
});

exports.Retrieve = stanza.define({
    name: 'retrieve',
    namespace: NS,
    element: 'items',
    fields: {
        node: stanza.attribute('node'),
        max: stanza.attribute('max_items')
    }
});

exports.Item = stanza.define({
    name: 'item',
    namespace: NS,
    element: 'item',
    fields: {
        id: stanza.attribute('id')
    }
});

exports.EventItems = stanza.define({
    name: 'updated',
    namespace: EventNS,
    element: 'items',
    fields: {
        node: stanza.attribute('node'),
        retracted: {
            get: function () {
                var results = [];
                var retracted = stanza.find(this.xml, this._NS, 'retract');

                _.forEach(retracted, function (xml) {
                    results.push(xml.getAttribute('id'));
                });
                return results;
            },
            set: function (value) {
                var self = this;
                _.forEach(value, function (id) {
                    var retracted = document.createElementNS(self._NS, 'retract');
                    retracted.setAttribute('id', id);
                    this.xml.appendChild(retracted);
                });
            }
        }
    }
});

exports.EventItem = stanza.define({
    name: 'eventItem',
    namespace: EventNS,
    element: 'item',
    fields: {
        id: stanza.attribute('id'),
        node: stanza.attribute('node'),
        publisher: util.jidAttribute('publisher')
    }
});


stanza.extend(exports.Pubsub, exports.Subscribe);
stanza.extend(exports.Pubsub, exports.Unsubscribe);
stanza.extend(exports.Pubsub, exports.Publish);
stanza.extend(exports.Pubsub, exports.Retrieve);
stanza.extend(exports.Pubsub, exports.Subscription);
stanza.extend(exports.PubsubOwner, exports.Configure);
stanza.extend(exports.Publish, exports.Item, 'items');
stanza.extend(exports.Retrieve, exports.Item, 'items');
stanza.extend(exports.Configure, Form);
stanza.extend(exports.Pubsub, RSM);
stanza.extend(exports.Event, exports.EventItems);
stanza.extend(exports.EventItems, exports.EventItem, 'published');
stanza.extend(Message, exports.Event);
stanza.extend(Iq, exports.Pubsub);
stanza.extend(Iq, exports.PubsubOwner);

},{"../jid":3,"./dataforms":32,"./iq":38,"./message":42,"./rsm":49,"./util":58,"jxt":98,"underscore":119}],47:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');


stanza.add(Message, 'requestReceipt', stanza.boolSub('urn:xmpp:receipts', 'request'));

var Received = module.exports = stanza.define({
    name: 'receipt',
    namespace: 'urn:xmpp:receipts',
    element: 'receipt',
    fields: {
        id: stanza.attribute('id')
    }
});

stanza.extend(Message, Received);

},{"./message":42,"jxt":98}],48:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var Iq = require('./iq');
var JID = require('../jid');


var Roster = module.exports = stanza.define({
    name: 'roster',
    namespace: 'jabber:iq:roster',
    element: 'query',
    fields: {
        ver: {
            get: function () {
                return stanza.getAttribute(this.xml, 'ver');
            },
            set: function (value) {
                var force = (value === '');
                stanza.setAttribute(this.xml, 'ver', value, force);
            }
        },
        items: {
            get: function () {
                var self = this;

                var items = stanza.find(this.xml, this._NS, 'item');
                if (!items.length) {
                    return [];
                }
                var results = [];
                items.forEach(function (item) {
                    var data = {
                        jid: new JID(stanza.getAttribute(item, 'jid', '')),
                        name: stanza.getAttribute(item, 'name', undefined),
                        subscription: stanza.getAttribute(item, 'subscription', 'none'),
                        ask: stanza.getAttribute(item, 'ask', undefined),
                        groups: []
                    };
                    var groups = stanza.find(item, self._NS, 'group');
                    groups.forEach(function (group) {
                        data.groups.push(group.textContent);
                    });
                    results.push(data);
                });
                return results;
            },
            set: function (values) {
                var self = this;
                values.forEach(function (value) {
                    var item = document.createElementNS(self._NS, 'item');
                    stanza.setAttribute(item, 'jid', value.jid.toString());
                    stanza.setAttribute(item, 'name', value.name);
                    stanza.setAttribute(item, 'subscription', value.subscription);
                    stanza.setAttribute(item, 'ask', value.ask);
                    (value.groups || []).forEach(function (name) {
                        var group = document.createElementNS(self._NS, 'group');
                        group.textContent = name;
                        item.appendChild(group);
                    });
                    self.xml.appendChild(item);
                });
            }
        }
    }
});

stanza.extend(Iq, Roster);

},{"../jid":3,"./iq":38,"jxt":98,"underscore":119}],49:[function(require,module,exports){
var stanza = require('jxt');
var util = require('./util');


var NS = 'http://jabber.org/protocol/rsm';


module.exports = stanza.define({
    name: 'rsm',
    namespace: NS,
    element: 'set',
    fields: {
        after: stanza.subText(NS, 'after'),
        before: {
            get: function () {
                return stanza.getSubText(this.xml, this._NS, 'before');
            },
            set: function (value) {
                if (value === true) {
                    stanza.findOrCreate(this.xml, this._NS, 'before');
                } else {
                    stanza.setSubText(this.xml, this._NS, 'before', value);
                }
            }
        },
        count: stanza.numberSub(NS, 'count'),
        first: stanza.subText(NS, 'first'),
        firstIndex: stanza.subAttribute(NS, 'first', 'index'),
        index: stanza.subText(NS, 'index'),
        last: stanza.subText(NS, 'last'),
        max: stanza.subText(NS, 'max')
    }
});

},{"./util":58,"jxt":98}],50:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var jingle = require('./jingle');


var NS = 'urn:xmpp:jingle:apps:rtp:1';
var FBNS = 'urn:xmpp:jingle:apps:rtp:rtcp-fb:0';
var HDRNS = 'urn:xmpp:jingle:apps:rtp:rtp-hdrext:0';
var INFONS = 'urn:xmpp:jingle:apps:rtp:info:1';


var Feedback = {
    get: function () {
        var existing = stanza.find(this.xml, FBNS, 'rtcp-fb');
        var result = [];
        existing.forEach(function (xml) {
            result.push({
                type: stanza.getAttribute(xml, 'type'),
                subtype: stanza.getAttribute(xml, 'subtype')
            });
        });
        existing = stanza.find(this.xml, FBNS, 'rtcp-fb-trr-int');
        existing.forEach(function (xml) {
            result.push({
                type: stanza.getAttribute(xml, 'type'),
                value: stanza.getAttribute(xml, 'value')
            });
        });
        return result;
    },
    set: function (values) {
        var self = this;
        var existing = stanza.find(this.xml, FBNS, 'rtcp-fb');
        existing.forEach(function (item) {
            self.xml.removeChild(item);
        });
        existing = stanza.find(this.xml, FBNS, 'rtcp-fb-trr-int');
        existing.forEach(function (item) {
            self.xml.removeChild(item);
        });

        values.forEach(function (value) {
            var fb;
            if (value.type === 'trr-int') {
                fb = stanza.createElement(FBNS, 'rtcp-fb-trr-int', NS);
                stanza.setAttribute(fb, 'type', value.type);
                stanza.setAttribute(fb, 'value', value.value);
            } else {
                fb = stanza.createElement(FBNS, 'rtcp-fb', NS);
                stanza.setAttribute(fb, 'type', value.type);
                stanza.setAttribute(fb, 'subtype', value.subtype);
            }
            self.xml.appendChild(fb);
        });
    }
};


exports.RTP = stanza.define({
    name: '_rtp',
    namespace: NS,
    element: 'description',
    fields: {
        descType: {value: 'rtp'},
        media: stanza.attribute('media'),
        ssrc: stanza.attribute('ssrc'),
        bandwidth: stanza.subText(NS, 'bandwidth'),
        bandwidthType: stanza.subAttribute(NS, 'bandwidth', 'type'),
        mux: stanza.boolSub(NS, 'rtcp-mux'),
        encryption: {
            get: function () {
                var enc = stanza.find(this.xml, NS, 'encryption');
                if (!enc.length) return [];
                enc = enc[0];

                var self = this;
                var data = stanza.find(enc, NS, 'crypto');
                var results = [];

                data.forEach(function (xml) {
                    results.push(new exports.Crypto({}, xml, self).toJSON());
                });
                return results;
            },
            set: function (values) {
                var enc = stanza.find(this.xml, NS, 'encryption');
                if (enc.length) {
                    this.xml.removeChild(enc);
                }

                if (!values.length) return;

                stanza.setBoolSubAttribute(this.xml, NS, 'encryption', 'required', true);
                enc = stanza.find(this.xml, NS, 'encryption')[0];

                var self = this;
                values.forEach(function (value) {
                    var content = new exports.Crypto(value, null, self);
                    enc.appendChild(content.xml);
                });
            }
        },
        feedback: Feedback,
        headerExtensions: {
            get: function () {
                var existing = stanza.find(this.xml, HDRNS, 'rtp-hdrext');
                var result = [];
                existing.forEach(function (xml) {
                    result.push({
                        id: stanza.getAttribute(xml, 'id'),
                        uri: stanza.getAttribute(xml, 'uri'),
                        senders: stanza.getAttribute(xml, 'senders')
                    });
                });
                return result;
            },
            set: function (values) {
                var self = this;
                var existing = stanza.find(this.xml, HDRNS, 'rtp-hdrext');
                existing.forEach(function (item) {
                    self.xml.removeChild(item);
                });

                values.forEach(function (value) {
                    var hdr = stanza.createElement(HDRNS, 'rtp-hdrext', NS);
                    stanza.setAttribute(hdr, 'id', value.id);
                    stanza.setAttribute(hdr, 'uri', value.uri);
                    stanza.setAttribute(hdr, 'senders', value.senders);
                    self.xml.appendChild(hdr);
                });
            }
        }
    }
});


exports.PayloadType = stanza.define({
    name: '_payloadType',
    namespace: NS,
    element: 'payload-type',
    fields: {
        channels: stanza.attribute('channels'),
        clockrate: stanza.attribute('clockrate'),
        id: stanza.attribute('id'),
        maxptime: stanza.attribute('maxptime'),
        name: stanza.attribute('name'),
        ptime: stanza.attribute('ptime'),
        feedback: Feedback,
        parameters: {
            get: function () {
                var result = [];
                var params = stanza.find(this.xml, NS, 'parameter');
                params.forEach(function (param) {
                    result.push({
                        key: stanza.getAttribute(param, 'name'),
                        value: stanza.getAttribute(param, 'value')
                    });
                });
                return result;
            },
            set: function (values) {
                var self = this;
                values.forEach(function (value) {
                    var param = stanza.createElement(NS, 'parameter');
                    stanza.setAttribute(param, 'name', value.key);
                    stanza.setAttribute(param, 'value', value.value);
                    self.xml.appendChild(param);
                });
            }
        }
    }
});


exports.Crypto = stanza.define({
    name: 'crypto',
    namespace: NS,
    element: 'crypto',
    fields: {
        cipherSuite: stanza.attribute('crypto-suite'),
        keyParams: stanza.attribute('key-params'),
        sessionParams: stanza.attribute('session-params'),
        tag: stanza.attribute('tag')
    }
});


// Bundle mapping has not been standardized yet
exports.Bundle = stanza.define({
    name: '_group',
    namespace: 'urn:ietf:rfc:5888',
    element: 'group',
    fields: {
        semantics: stanza.attribute('semantics'),
        contents: {
            get: function () {
                var self = this;
                return stanza.getMultiSubText(this.xml, this._NS, 'content', function (sub) {
                    return stanza.getAttribute(sub, 'name');
                });
            },
            set: function (value) {
                var self = this;
                stanza.setMultiSubText(this.xml, this._NS, 'content', value, function (val) {
                    var child = stanza.createElement(self._NS, 'content', self._NS);
                    stanza.setAttribute(child, 'name', val);
                    self.xml.appendChild(child);
                });
            }
        }
    }
});


// SSRC mapping has not been standardized yet
exports.SSRC = stanza.define({
    name: '_ssrc',
    namespace: 'http://estos.de/ns/ssrc',
    element: 'ssrc',
    fields: {
        ssrc: stanza.attribute('ssrc'),
        cname: stanza.attribute('cname'),
        msid: stanza.attribute('msid'),
        mslabel: stanza.attribute('mslabel'),
        label: stanza.attribute('label')
    }
});


exports.Mute = stanza.define({
    name: 'mute',
    namespace: INFONS,
    element: 'mute',
    fields: {
        creator: stanza.attribute('creator'),
        name: stanza.attribute('name')
    }
});


exports.Unmute = stanza.define({
    name: 'unmute',
    namespace: INFONS,
    element: 'unmute',
    fields: {
        creator: stanza.attribute('creator'),
        name: stanza.attribute('name')
    }
});


stanza.extend(jingle.Content, exports.RTP);
stanza.extend(exports.RTP, exports.PayloadType, 'payloads');
stanza.extend(exports.RTP, exports.SSRC, 'ssrcs');

stanza.extend(jingle.Jingle, exports.Mute);
stanza.extend(jingle.Jingle, exports.Unmute);
stanza.extend(jingle.Jingle, exports.Bundle, 'groupings');
stanza.add(jingle.Jingle, 'ringing', stanza.boolSub(INFONS, 'ringing'));
stanza.add(jingle.Jingle, 'hold', stanza.boolSub(INFONS, 'hold'));
stanza.add(jingle.Jingle, 'active', stanza.boolSub(INFONS, 'active'));

},{"./jingle":39,"./util":58,"jxt":98,"underscore":119}],51:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');
var util = require('./util');
var StreamFeatures = require('./streamFeatures');

var NS = 'urn:ietf:params:xml:ns:xmpp-sasl';
var CONDITIONS = [
    'aborted', 'account-disabled', 'credentials-expired',
    'encryption-required', 'incorrect-encoding', 'invalid-authzid',
    'invalid-mechanism', 'malformed-request', 'mechanism-too-weak',
    'not-authorized', 'temporary-auth-failure'
];

exports.Mechanisms = stanza.define({
    name: 'sasl',
    namespace: NS,
    element: 'mechanisms',
    fields: {
        mechanisms: stanza.multiSubText(NS, 'mechanism')
    }
});

exports.Auth = stanza.define({
    name: 'saslAuth',
    eventName: 'sasl:auth',
    namespace: NS,
    element: 'auth',
    topLevel: true,
    fields: {
        value: stanza.b64Text(),
        mechanism: stanza.attribute('mechanism')
    }
});

exports.Challenge = stanza.define({
    name: 'saslChallenge',
    eventName: 'sasl:challenge',
    namespace: NS,
    element: 'challenge',
    topLevel: true,
    fields: {
        value: stanza.b64Text()
    }
});

exports.Response = stanza.define({
    name: 'saslResponse',
    eventName: 'sasl:response',
    namespace: NS,
    element: 'response',
    topLevel: true,
    fields: {
        value: stanza.b64Text()
    }
});

exports.Abort = stanza.define({
    name: 'saslAbort',
    eventName: 'sasl:abort',
    namespace: NS,
    element: 'abort',
    topLevel: true
});

exports.Success = stanza.define({
    name: 'saslSuccess',
    eventName: 'sasl:success',
    namespace: NS,
    element: 'success',
    topLevel: true,
    fields: {
        value: stanza.b64Text()
    }
});

exports.Failure = stanza.define({
    name: 'saslFailure',
    eventName: 'sasl:failure',
    namespace: NS,
    element: 'failure',
    topLevel: true,
    fields: {
        lang: {
            get: function () {
                return this._lang || '';
            },
            set: function (value) {
                this._lang = value;
            }
        },
        condition: {
            get: function () {
                var self = this;
                var result = [];
                CONDITIONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, NS, condition);
                    if (exists.length) {
                        result.push(exists[0].tagName);
                    }
                });
                return result[0] || '';
            },
            set: function (value) {
                var self = this;
                this._CONDITIONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, NS, condition);
                    if (exists.length) {
                        self.xml.removeChild(exists[0]);
                    }
                });
                if (value) {
                    var condition = stanza.createElementNS(NS, value);
                    condition.setAttribute('xmlns', NS);
                    this.xml.appendChild(condition);
                }
            }
        },
        $text: {
            get: function () {
                return stanza.getSubLangText(this.xml, NS, 'text', this.lang);
            }
        },
        text: {
            get: function () {
                var text = this.$text;
                return text[this.lang] || '';
            },
            set: function (value) {
                stanza.setSubLangText(this.xml, NS, 'text', value, this.lang);
            }
        }
    }
});


stanza.extend(StreamFeatures, exports.Mechanisms);

},{"./streamFeatures":56,"./util":58,"jxt":98,"underscore":119}],52:[function(require,module,exports){
var stanza = require('jxt');
var Iq = require('./iq');
var StreamFeatures = require('./streamFeatures');

var Session = module.exports = stanza.define({
    name: 'session',
    namespace: 'urn:ietf:params:xml:ns:xmpp-session',
    element: 'session'
});

stanza.extend(StreamFeatures, Session);
stanza.extend(Iq, Session);

},{"./iq":38,"./streamFeatures":56,"jxt":98}],53:[function(require,module,exports){
var stanza = require('jxt');
var util = require('./util');
var StreamFeatures = require('./streamFeatures');


var NS = 'urn:xmpp:sm:3';


exports.SMFeature = stanza.define({
    name: 'streamManagement',
    namespace: NS,
    element: 'sm'
});

exports.Enable = stanza.define({
    name: 'smEnable',
    eventName: 'stream:management:enable',
    namespace: NS,
    element: 'enable',
    topLevel: true,
    fields: {
        resume: stanza.boolAttribute('resume')
    }
});

exports.Enabled = stanza.define({
    name: 'smEnabled',
    eventName: 'stream:management:enabled',
    namespace: NS,
    element: 'enabled',
    topLevel: true,
    fields: {
        id: stanza.attribute('id'),
        resume: stanza.boolAttribute('resume')
    }
});

exports.Resume = stanza.define({
    name: 'smResume',
    eventName: 'stream:management:resume',
    namespace: NS,
    element: 'resume',
    topLevel: true,
    fields: {
        h: stanza.numberAttribute('h'),
        previd: stanza.attribute('previd')
    }
});

exports.Resumed = stanza.define({
    name: 'smResumed',
    eventName: 'stream:management:resumed',
    namespace: NS,
    element: 'resumed',
    topLevel: true,
    fields: {
        h: stanza.numberAttribute('h'),
        previd: stanza.attribute('previd')
    }
});

exports.Failed = stanza.define({
    name: 'smFailed',
    eventName: 'stream:management:failed',
    namespace: NS,
    element: 'failed',
    topLevel: true
});

exports.Ack = stanza.define({
    name: 'smAck',
    eventName: 'stream:management:ack',
    namespace: NS,
    element: 'a',
    topLevel: true,
    fields: {
        h: stanza.numberAttribute('h')
    }
});

exports.Request = stanza.define({
    name: 'smRequest',
    eventName: 'stream:management:request',
    namespace: NS,
    element: 'r',
    topLevel: true
});


stanza.extend(StreamFeatures, exports.SMFeature);

},{"./streamFeatures":56,"./util":58,"jxt":98}],54:[function(require,module,exports){
var stanza = require('jxt');
var util = require('./util');


module.exports = stanza.define({
    name: 'stream',
    namespace: 'http://etherx.jabber.org/streams',
    element: 'stream',
    fields: {
        lang: {
            get: function () {
                return this.xml.getAttributeNS(stanza.XML_NS, 'lang') || '';
            },
            set: function (value) {
                this.xml.setAttributeNS(stanza.XML_NS, 'lang', value);
            }
        },
        id: stanza.attribute('id'),
        version: stanza.attribute('version', '1.0'),
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from')
    }
});

},{"./util":58,"jxt":98}],55:[function(require,module,exports){
var _ = require('underscore');
var stanza = require('jxt');


var ERR_NS = 'urn:ietf:params:xml:ns:xmpp-streams';
var CONDITIONS = [
    'bad-format', 'bad-namespace-prefix', 'conflict',
    'connection-timeout', 'host-gone', 'host-unknown',
    'improper-addressing', 'internal-server-error', 'invalid-from',
    'invalid-namespace', 'invalid-xml', 'not-authorized',
    'not-well-formed', 'policy-violation', 'remote-connection-failed',
    'reset', 'resource-constraint', 'restricted-xml', 'see-other-host',
    'system-shutdown', 'undefined-condition', 'unsupported-encoding',
    'unsupported-feature', 'unsupported-stanza-type',
    'unsupported-version'
];

module.exports = stanza.define({
    name: 'streamError',
    namespace: 'http://etherx.jabber.org/streams',
    element: 'error',
    topLevel: true,
    fields: {
        lang: {
            get: function () {
                return this._lang || '';
            },
            set: function (value) {
                this._lang = value;
            }
        },
        condition: {
            get: function () {
                var self = this;
                var result = [];
                CONDITIONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, ERR_NS, condition);
                    if (exists.length) {
                        result.push(exists[0].tagName);
                    }
                });
                return result[0] || '';
            },
            set: function (value) {
                var self = this;
                this._CONDITIONS.forEach(function (condition) {
                    var exists = stanza.find(self.xml, ERR_NS, condition);
                    if (exists.length) {
                        self.xml.removeChild(exists[0]);
                    }
                });
                if (value) {
                    var condition = stanza.createElementNS(ERR_NS, value);
                    condition.setAttribute('xmlns', ERR_NS);
                    this.xml.appendChild(condition);
                }
            }
        },
        seeOtherHost: {
            get: function () {
                return stanza.getSubText(this.xml, ERR_NS, 'see-other-host');
            },
            set: function (value) {
                this.condition = 'see-other-host';
                stanza.setSubText(this.xml, ERR_NS, 'see-other-host', value);
            }
        },
        $text: {
            get: function () {
                return stanza.getSubLangText(this.xml, ERR_NS, 'text', this.lang);
            }
        },
        text: {
            get: function () {
                var text = this.$text;
                return text[this.lang] || '';
            },
            set: function (value) {
                stanza.setSubLangText(this.xml, ERR_NS, 'text', value, this.lang);
            }
        }
    }
});

},{"jxt":98,"underscore":119}],56:[function(require,module,exports){
var stanza = require('jxt');

var StreamFeatures = module.exports = stanza.define({
    name: 'streamFeatures',
    namespace: 'http://etherx.jabber.org/streams',
    element: 'features',
    topLevel: true,
    fields: {
        features: {
            get: function () {
                return this._extensions;
            }
        }
    }
});

var RosterVerFeature = stanza.define({
    name: 'rosterVersioning',
    namespace: 'urn:xmpp:features:rosterver',
    element: 'ver'
});

var SubscriptionPreApprovalFeature = stanza.define({
    name: 'subscriptionPreApproval',
    namespace: 'urn:xmpp:features:pre-approval',
    element: 'sub'
});


stanza.extend(StreamFeatures, RosterVerFeature);
stanza.extend(StreamFeatures, SubscriptionPreApprovalFeature);

},{"jxt":98}],57:[function(require,module,exports){
var stanza = require('jxt');
var util = require('./util');
var Iq = require('./iq');

var EntityTime = module.exports = stanza.define({
    name: 'time',
    namespace: 'urn:xmpp:time',
    element: 'time',
    fields: {
        utc: stanza.dateSub('urn:xmpp:time', 'utc'),
        tzo: {
            get: function () {
                var split, hrs, min;
                var sign = -1;
                var formatted = stanza.getSubText(this.xml, this._NS, 'tzo');

                if (!formatted) {
                    return 0;
                }
                if (formatted.charAt(0) === '-') {
                    sign = 1;
                    formatted = formatted.slice(1);
                }
                split = formatted.split(':');
                hrs = parseInt(split[0], 10);
                min = parseInt(split[1], 10);
                return (hrs * 60 + min) * sign;
            },
            set: function (value) {
                var hrs, min;
                var formatted = '-';
                if (typeof value === 'number') {
                    if (value < 0) {
                        value = -value;
                        formatted = '+';
                    }
                    hrs = value / 60;
                    min = value % 60;
                    formatted += (hrs < 10 ? '0' : '') + hrs + ':' + (min < 10 ? '0' : '') + min;
                } else {
                    formatted = value;
                }
                stanza.setSubText(this.xml, this._NS, 'tzo', formatted);
            }
        }
    }
});


stanza.extend(Iq, EntityTime);

},{"./iq":38,"./util":58,"jxt":98}],58:[function(require,module,exports){
var stanza = require('jxt');
var JID = require('../jid');


exports.jidAttribute = stanza.field(
    function (xml, attr) {
        return new JID(stanza.getAttribute(xml, attr));
    },
    function (xml, attr, value) {
        stanza.setAttribute(xml, attr, (value || '').toString());
    }
);

exports.jidSub = stanza.field(
    function (xml, NS, sub) {
        return new JID(stanza.getSubText(xml, NS, sub));
    },
    function (xml, NS, sub, value) {
        stanza.setSubText(xml, NS, sub, (value || '').toString());
    }
);

},{"../jid":3,"jxt":98}],59:[function(require,module,exports){
var stanza = require('jxt');
var Iq = require('./iq');

var NS = 'jabber:iq:version';

var Version = module.exports = stanza.define({
    name: 'version',
    namespace: NS,
    element: 'query',
    fields: {
        name: stanza.subText(NS, 'name'),
        version: stanza.subText(NS, 'version'),
        os: stanza.subText(NS, 'os')
    }
});

stanza.extend(Iq, Version);

},{"./iq":38,"jxt":98}],60:[function(require,module,exports){
var stanza = require('jxt');
var Iq = require('./iq');


stanza.add(Iq, 'visible', stanza.boolSub('urn:xmpp:invisible:0', 'visible'));
stanza.add(Iq, 'invisible', stanza.boolSub('urn:xmpp:invisible:0', 'invisible'));

},{"./iq":38,"jxt":98}],61:[function(require,module,exports){
var _ = require('underscore');
var WildEmitter = require('wildemitter');
var async = require('async');
var Stream = require('./stanza/stream');
var Message = require('./stanza/message');
var Presence = require('./stanza/presence');
var Iq = require('./stanza/iq');
var StreamManagement = require('./sm');
var uuid = require('node-uuid');


function WSConnection() {
    var self = this;

    WildEmitter.call(this);

    self.sm = new StreamManagement(self);

    self.sendQueue = async.queue(function (data, cb) {
        if (self.conn) {
            self.emit('raw:outgoing', data);

            self.sm.track(data);

            if (typeof data !== 'string') {
                data = data.toString();
            }

            self.conn.send(data);
        }
        cb();
    }, 1);

    function wrap(data) {
        var result = [self.streamStart, data, self.streamEnd].join('');
        return result;
    }

    function parse(data) {
        var nodes = (self.parser.parseFromString(data, 'application/xml')).childNodes;
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].nodeType === 1) {
                return nodes[i];
            }
        }
    }

    self.on('connected', function () {
        self.send([
            '<stream:stream',
            'xmlns:stream="http://etherx.jabber.org/streams"',
            'xmlns="jabber:client"',
            'version="' + (self.config.version || '1.0') + '"',
            'xml:lang="' + (self.config.lang || 'en') + '"',
            'to="' + self.config.server + '">'
        ].join(' '));
    });

    self.on('raw:incoming', function (data) {
        var streamData, ended;

        data = data.trim();
        data = data.replace(/^(\s*<\?.*\?>\s*)*/, '');
        if (data === '') {
            return;
        }

        if (data.match(self.streamEnd)) {
            return self.disconnect();
        } else if (self.hasStream) {
            try {
                streamData = new Stream({}, parse(wrap(data)));
            } catch (e) {
                return self.disconnect();
            }
        } else {
            // Inspect start of stream element to get NS prefix name
            var parts = data.match(/^<(\S+:)?(\S+) /);
            self.streamStart = data;
            self.streamEnd = '</' + (parts[1] || '') + parts[2] + '>';

            ended = false;
            try {
                streamData = new Stream({}, parse(data + self.streamEnd));
            } catch (e) {
                try {
                    streamData = new Stream({}, parse(data));
                    ended = true;
                } catch (e2) {
                    return self.disconnect();
                }
            }

            self.hasStream = true;
            self.stream = streamData;
            self.emit('stream:start', streamData);
        }

        _.each(streamData._extensions, function (stanzaObj) {
            if (!stanzaObj.lang) {
                stanzaObj.lang = self.stream.lang;
            }

            if (stanzaObj._name === 'message' || stanzaObj._name === 'presence' || stanzaObj._name === 'iq') {
                self.sm.handle(stanzaObj);
                self.emit('stanza', stanzaObj);
            }
            self.emit(stanzaObj._eventname || stanzaObj._name, stanzaObj);
            self.emit('stream:data', stanzaObj);

            if (stanzaObj.id) {
                self.emit('id:' + stanzaObj.id, stanzaObj);
            }
        });

        if (ended) {
            self.emit('stream:end');
        }
    });
}

WSConnection.prototype = Object.create(WildEmitter.prototype, {
    constructor: {
        value: WSConnection
    }
});

WSConnection.prototype.connect = function (opts) {
    var self = this;

    self.config = opts;

    self.hasStream = false;
    self.streamStart = '<stream:stream xmlns:stream="http://etherx.jabber.org/streams">';
    self.streamEnd = '</stream:stream>';
    self.parser = new DOMParser();
    self.serializer = new XMLSerializer();

    self.conn = new WebSocket(opts.wsURL, 'xmpp');
    self.conn.onerror = function (e) {
        e.preventDefault();
        self.emit('disconnected', self);
        return false;
    };

    self.conn.onclose = function () {
        self.emit('disconnected', self);
    };

    self.conn.onopen = function () {
        self.sm.started = false;
        self.emit('connected', self);
    };

    self.conn.onmessage = function (wsMsg) {
        self.emit('raw:incoming', wsMsg.data);
    };
};

WSConnection.prototype.disconnect = function () {
    if (this.conn) {
        if (this.hasStream) {
            this.conn.send('</stream:stream>');
            this.emit('raw:outgoing', '</stream:stream>');
            this.emit('stream:end');
        }
        this.hasStream = false;
        this.conn.close();
        this.stream = undefined;
        this.conn = undefined;
        this.sm.failed();
    }
};

WSConnection.prototype.restart = function () {
    var self = this;
    self.hasStream = false;
    self.send([
        '<stream:stream',
        'xmlns:stream="http://etherx.jabber.org/streams"',
        'xmlns="jabber:client"',
        'version="' + (self.config.version || '1.0') + '"',
        'xml:lang="' + (self.config.lang || 'en') + '"',
        'to="' + self.config.server + '">'
    ].join(' '));
};

WSConnection.prototype.send = function (data) {
    this.sendQueue.push(data);
};


module.exports = WSConnection;

},{"./sm":25,"./stanza/iq":38,"./stanza/message":42,"./stanza/presence":44,"./stanza/stream":54,"async":62,"node-uuid":105,"underscore":119,"wildemitter":120}],62:[function(require,module,exports){
var process=require("__browserify_process");/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = setImmediate;
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                }
            }));
        });
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback(null);
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (err, v) {
                results[x.index] = v;
                callback(err);
            });
        }, function (err) {
            callback(err, results);
        });
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        if (!keys.length) {
            return callback(null);
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (_keys(results).length === keys.length) {
                callback(null, results);
                callback = function () {};
            }
        });

        _each(keys, function (k) {
            var task = (tasks[k] instanceof Function) ? [tasks[k]]: tasks[k];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor !== Array) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (tasks.constructor === Array) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (test()) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            if (!test()) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if(data.constructor !== Array) {
              data = [data];
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            }
        };
        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            push: function (data, callback) {
                if(data.constructor !== Array) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain) cargo.drain();
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                callback.apply(null, memo[key]);
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.compose = function (/* functions... */) {
        var fns = Array.prototype.reverse.call(arguments);
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // AMD / RequireJS
    if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // Node.js
    else if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

},{"__browserify_process":71}],63:[function(require,module,exports){


//
// The shims in this file are not fully implemented shims for the ES5
// features, but do work for the particular usecases there is in
// the other modules.
//

var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Array.isArray is supported in IE9
function isArray(xs) {
  return toString.call(xs) === '[object Array]';
}
exports.isArray = typeof Array.isArray === 'function' ? Array.isArray : isArray;

// Array.prototype.indexOf is supported in IE9
exports.indexOf = function indexOf(xs, x) {
  if (xs.indexOf) return xs.indexOf(x);
  for (var i = 0; i < xs.length; i++) {
    if (x === xs[i]) return i;
  }
  return -1;
};

// Array.prototype.filter is supported in IE9
exports.filter = function filter(xs, fn) {
  if (xs.filter) return xs.filter(fn);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    if (fn(xs[i], i, xs)) res.push(xs[i]);
  }
  return res;
};

// Array.prototype.forEach is supported in IE9
exports.forEach = function forEach(xs, fn, self) {
  if (xs.forEach) return xs.forEach(fn, self);
  for (var i = 0; i < xs.length; i++) {
    fn.call(self, xs[i], i, xs);
  }
};

// Array.prototype.map is supported in IE9
exports.map = function map(xs, fn) {
  if (xs.map) return xs.map(fn);
  var out = new Array(xs.length);
  for (var i = 0; i < xs.length; i++) {
    out[i] = fn(xs[i], i, xs);
  }
  return out;
};

// Array.prototype.reduce is supported in IE9
exports.reduce = function reduce(array, callback, opt_initialValue) {
  if (array.reduce) return array.reduce(callback, opt_initialValue);
  var value, isValueSet = false;

  if (2 < arguments.length) {
    value = opt_initialValue;
    isValueSet = true;
  }
  for (var i = 0, l = array.length; l > i; ++i) {
    if (array.hasOwnProperty(i)) {
      if (isValueSet) {
        value = callback(value, array[i], i, array);
      }
      else {
        value = array[i];
        isValueSet = true;
      }
    }
  }

  return value;
};

// String.prototype.substr - negative index don't work in IE8
if ('ab'.substr(-1) !== 'b') {
  exports.substr = function (str, start, length) {
    // did we get a negative start, calculate how much it is from the beginning of the string
    if (start < 0) start = str.length + start;

    // call the original function
    return str.substr(start, length);
  };
} else {
  exports.substr = function (str, start, length) {
    return str.substr(start, length);
  };
}

// String.prototype.trim is supported in IE9
exports.trim = function (str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
};

// Function.prototype.bind is supported in IE9
exports.bind = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  if (fn.bind) return fn.bind.apply(fn, args);
  var self = args.shift();
  return function () {
    fn.apply(self, args.concat([Array.prototype.slice.call(arguments)]));
  };
};

// Object.create is supported in IE9
function create(prototype, properties) {
  var object;
  if (prototype === null) {
    object = { '__proto__' : null };
  }
  else {
    if (typeof prototype !== 'object') {
      throw new TypeError(
        'typeof prototype[' + (typeof prototype) + '] != \'object\''
      );
    }
    var Type = function () {};
    Type.prototype = prototype;
    object = new Type();
    object.__proto__ = prototype;
  }
  if (typeof properties !== 'undefined' && Object.defineProperties) {
    Object.defineProperties(object, properties);
  }
  return object;
}
exports.create = typeof Object.create === 'function' ? Object.create : create;

// Object.keys and Object.getOwnPropertyNames is supported in IE9 however
// they do show a description and number property on Error objects
function notObject(object) {
  return ((typeof object != "object" && typeof object != "function") || object === null);
}

function keysShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.keys called on a non-object");
  }

  var result = [];
  for (var name in object) {
    if (hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// getOwnPropertyNames is almost the same as Object.keys one key feature
//  is that it returns hidden properties, since that can't be implemented,
//  this feature gets reduced so it just shows the length property on arrays
function propertyShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.getOwnPropertyNames called on a non-object");
  }

  var result = keysShim(object);
  if (exports.isArray(object) && exports.indexOf(object, 'length') === -1) {
    result.push('length');
  }
  return result;
}

var keys = typeof Object.keys === 'function' ? Object.keys : keysShim;
var getOwnPropertyNames = typeof Object.getOwnPropertyNames === 'function' ?
  Object.getOwnPropertyNames : propertyShim;

if (new Error().hasOwnProperty('description')) {
  var ERROR_PROPERTY_FILTER = function (obj, array) {
    if (toString.call(obj) === '[object Error]') {
      array = exports.filter(array, function (name) {
        return name !== 'description' && name !== 'number' && name !== 'message';
      });
    }
    return array;
  };

  exports.keys = function (object) {
    return ERROR_PROPERTY_FILTER(object, keys(object));
  };
  exports.getOwnPropertyNames = function (object) {
    return ERROR_PROPERTY_FILTER(object, getOwnPropertyNames(object));
  };
} else {
  exports.keys = keys;
  exports.getOwnPropertyNames = getOwnPropertyNames;
}

// Object.getOwnPropertyDescriptor - supported in IE8 but only on dom elements
function valueObject(value, key) {
  return { value: value[key] };
}

if (typeof Object.getOwnPropertyDescriptor === 'function') {
  try {
    Object.getOwnPropertyDescriptor({'a': 1}, 'a');
    exports.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  } catch (e) {
    // IE8 dom element issue - use a try catch and default to valueObject
    exports.getOwnPropertyDescriptor = function (value, key) {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch (e) {
        return valueObject(value, key);
      }
    };
  }
} else {
  exports.getOwnPropertyDescriptor = valueObject;
}

},{}],64:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// UTILITY
var util = require('util');
var shims = require('_shims');
var pSlice = Array.prototype.slice;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  this.message = options.message || getMessage(this);
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = shims.keys(a),
        kb = shims.keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};
},{"_shims":63,"util":66}],65:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util');

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!util.isNumber(n) || n < 0)
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (util.isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (util.isUndefined(handler))
    return false;

  if (util.isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (util.isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              util.isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (util.isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (util.isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!util.isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  function g() {
    this.removeListener(type, g);
    listener.apply(this, arguments);
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!util.isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (util.isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (util.isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (util.isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (util.isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (util.isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};
},{"util":66}],66:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var shims = require('_shims');

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  shims.forEach(array, function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = shims.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = shims.getOwnPropertyNames(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }

  shims.forEach(keys, function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = shims.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }

  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (shims.indexOf(ctx.seen, desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = shims.reduce(output, function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return shims.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && objectToString(e) === '[object Error]';
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.binarySlice === 'function'
  ;
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = shims.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = shims.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"_shims":63}],67:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],68:[function(require,module,exports){
var assert;
exports.Buffer = Buffer;
exports.SlowBuffer = Buffer;
Buffer.poolSize = 8192;
exports.INSPECT_MAX_BYTES = 50;

function stringtrim(str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
}

function Buffer(subject, encoding, offset) {
  if(!assert) assert= require('assert');
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }
  this.parent = this;
  this.offset = 0;

  // Work-around: node's base64 implementation
  // allows for non-padded strings while base64-js
  // does not..
  if (encoding == "base64" && typeof subject == "string") {
    subject = stringtrim(subject);
    while (subject.length % 4 != 0) {
      subject = subject + "="; 
    }
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    // slicing works, with limitations (no parent tracking/update)
    // check https://github.com/toots/buffer-browserify/issues/19
    for (var i = 0; i < this.length; i++) {
        this[i] = subject.get(i+offset);
    }
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this[i] = subject.readUInt8(i);
        }
        else {
          this[i] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    } else if (type === 'number') {
      for (var i = 0; i < this.length; i++) {
        this[i] = 0;
      }
    }
  }
}

Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i];
};

Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i] = v;
};

Buffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

Buffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

Buffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

Buffer.prototype.binaryWrite = Buffer.prototype.asciiWrite;

Buffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

Buffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
};

Buffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

Buffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

Buffer.prototype.binarySlice = Buffer.prototype.asciiSlice;

Buffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


Buffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  Buffer._charsWritten = i * 2;
  return i;
};


Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};

// slice(start, end)
function clamp(index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue;
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
}

Buffer.prototype.slice = function(start, end) {
  var len = this.length;
  start = clamp(start, len, 0);
  end = clamp(end, len, len);
  return new Buffer(this, end - start, +start);
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  if (end === undefined || isNaN(end)) {
    end = this.length;
  }
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  var temp = [];
  for (var i=start; i<end; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=target_start; i<target_start+temp.length; i++) {
    target[i] = temp[i-target_start];
  }
};

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof Buffer;
};

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

Buffer.isEncoding = function(encoding) {
  switch ((encoding + '').toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
    case 'raw':
      return true;

    default:
      return false;
  }
};

// helpers

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

function isArray(subject) {
  return (Array.isArray ||
    function(subject){
      return {}.toString.apply(subject) == '[object Array]'
    })
    (subject)
}

function isArrayIsh(subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

// read/write bit-twiddling

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer[offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer[offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1];
    }
  } else {
    val = buffer[offset];
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer[offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer[offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer[offset + 3];
    val = val + (buffer[offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer[offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer[offset + 1] << 8;
    val |= buffer[offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer[offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer[offset] & 0x80;
  if (!neg) {
    return (buffer[offset]);
  }

  return ((0xff - buffer[offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer[offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer[offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer[offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

},{"./buffer_ieee754":67,"assert":64,"base64-js":69}],69:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],70:[function(require,module,exports){
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],"q9TxCC":[function(require,module,exports){
var assert;
exports.Buffer = Buffer;
exports.SlowBuffer = Buffer;
Buffer.poolSize = 8192;
exports.INSPECT_MAX_BYTES = 50;

function stringtrim(str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
}

function Buffer(subject, encoding, offset) {
  if(!assert) assert= require('assert');
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }
  this.parent = this;
  this.offset = 0;

  // Work-around: node's base64 implementation
  // allows for non-padded strings while base64-js
  // does not..
  if (encoding == "base64" && typeof subject == "string") {
    subject = stringtrim(subject);
    while (subject.length % 4 != 0) {
      subject = subject + "="; 
    }
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    // slicing works, with limitations (no parent tracking/update)
    // check https://github.com/toots/buffer-browserify/issues/19
    for (var i = 0; i < this.length; i++) {
        this[i] = subject.get(i+offset);
    }
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this[i] = subject.readUInt8(i);
        }
        else {
          this[i] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    } else if (type === 'number') {
      for (var i = 0; i < this.length; i++) {
        this[i] = 0;
      }
    }
  }
}

Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i];
};

Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this[i] = v;
};

Buffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
    case 'binary':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

Buffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

Buffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

Buffer.prototype.binaryWrite = Buffer.prototype.asciiWrite;

Buffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return Buffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

Buffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
};

Buffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

Buffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

Buffer.prototype.binarySlice = Buffer.prototype.asciiSlice;

Buffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


Buffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  Buffer._charsWritten = i * 2;
  return i;
};


Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};

// slice(start, end)
function clamp(index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue;
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len;
  if (index >= 0) return index;
  index += len;
  if (index >= 0) return index;
  return 0;
}

Buffer.prototype.slice = function(start, end) {
  var len = this.length;
  start = clamp(start, len, 0);
  end = clamp(end, len, len);
  return new Buffer(this, end - start, +start);
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  if (end === undefined || isNaN(end)) {
    end = this.length;
  }
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  var temp = [];
  for (var i=start; i<end; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=target_start; i<target_start+temp.length; i++) {
    target[i] = temp[i-target_start];
  }
};

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof Buffer;
};

Buffer.concat = function (list, totalLength) {
  if (!isArray(list)) {
    throw new Error("Usage: Buffer.concat(list, [totalLength])\n \
      list should be an Array.");
  }

  if (list.length === 0) {
    return new Buffer(0);
  } else if (list.length === 1) {
    return list[0];
  }

  if (typeof totalLength !== 'number') {
    totalLength = 0;
    for (var i = 0; i < list.length; i++) {
      var buf = list[i];
      totalLength += buf.length;
    }
  }

  var buffer = new Buffer(totalLength);
  var pos = 0;
  for (var i = 0; i < list.length; i++) {
    var buf = list[i];
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

Buffer.isEncoding = function(encoding) {
  switch ((encoding + '').toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
    case 'raw':
      return true;

    default:
      return false;
  }
};

// helpers

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

function isArray(subject) {
  return (Array.isArray ||
    function(subject){
      return {}.toString.apply(subject) == '[object Array]'
    })
    (subject)
}

function isArrayIsh(subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

// read/write bit-twiddling

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer[offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    val = buffer[offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1];
    }
  } else {
    val = buffer[offset];
    if (offset + 1 < buffer.length) {
      val |= buffer[offset + 1] << 8;
    }
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return 0;

  if (isBigEndian) {
    if (offset + 1 < buffer.length)
      val = buffer[offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer[offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer[offset + 3];
    val = val + (buffer[offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer[offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer[offset + 1] << 8;
    val |= buffer[offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer[offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  neg = buffer[offset] & 0x80;
  if (!neg) {
    return (buffer[offset]);
  }

  return ((0xff - buffer[offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  if (offset < buffer.length) {
    buffer[offset] = value;
  }
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 2); i++) {
    buffer[offset + i] =
        (value & (0xff << (8 * (isBigEndian ? 1 - i : i)))) >>>
            (isBigEndian ? 1 - i : i) * 8;
  }

}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  for (var i = 0; i < Math.min(buffer.length - offset, 4); i++) {
    buffer[offset + i] =
        (value >>> (isBigEndian ? 3 - i : i) * 8) & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

},{"./buffer_ieee754":1,"assert":6,"base64-js":4}],"buffer-browserify":[function(require,module,exports){
module.exports=require('q9TxCC');
},{}],4:[function(require,module,exports){
(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;
	
		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

},{}],5:[function(require,module,exports){


//
// The shims in this file are not fully implemented shims for the ES5
// features, but do work for the particular usecases there is in
// the other modules.
//

var toString = Object.prototype.toString;
var hasOwnProperty = Object.prototype.hasOwnProperty;

// Array.isArray is supported in IE9
function isArray(xs) {
  return toString.call(xs) === '[object Array]';
}
exports.isArray = typeof Array.isArray === 'function' ? Array.isArray : isArray;

// Array.prototype.indexOf is supported in IE9
exports.indexOf = function indexOf(xs, x) {
  if (xs.indexOf) return xs.indexOf(x);
  for (var i = 0; i < xs.length; i++) {
    if (x === xs[i]) return i;
  }
  return -1;
};

// Array.prototype.filter is supported in IE9
exports.filter = function filter(xs, fn) {
  if (xs.filter) return xs.filter(fn);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    if (fn(xs[i], i, xs)) res.push(xs[i]);
  }
  return res;
};

// Array.prototype.forEach is supported in IE9
exports.forEach = function forEach(xs, fn, self) {
  if (xs.forEach) return xs.forEach(fn, self);
  for (var i = 0; i < xs.length; i++) {
    fn.call(self, xs[i], i, xs);
  }
};

// Array.prototype.map is supported in IE9
exports.map = function map(xs, fn) {
  if (xs.map) return xs.map(fn);
  var out = new Array(xs.length);
  for (var i = 0; i < xs.length; i++) {
    out[i] = fn(xs[i], i, xs);
  }
  return out;
};

// Array.prototype.reduce is supported in IE9
exports.reduce = function reduce(array, callback, opt_initialValue) {
  if (array.reduce) return array.reduce(callback, opt_initialValue);
  var value, isValueSet = false;

  if (2 < arguments.length) {
    value = opt_initialValue;
    isValueSet = true;
  }
  for (var i = 0, l = array.length; l > i; ++i) {
    if (array.hasOwnProperty(i)) {
      if (isValueSet) {
        value = callback(value, array[i], i, array);
      }
      else {
        value = array[i];
        isValueSet = true;
      }
    }
  }

  return value;
};

// String.prototype.substr - negative index don't work in IE8
if ('ab'.substr(-1) !== 'b') {
  exports.substr = function (str, start, length) {
    // did we get a negative start, calculate how much it is from the beginning of the string
    if (start < 0) start = str.length + start;

    // call the original function
    return str.substr(start, length);
  };
} else {
  exports.substr = function (str, start, length) {
    return str.substr(start, length);
  };
}

// String.prototype.trim is supported in IE9
exports.trim = function (str) {
  if (str.trim) return str.trim();
  return str.replace(/^\s+|\s+$/g, '');
};

// Function.prototype.bind is supported in IE9
exports.bind = function () {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();
  if (fn.bind) return fn.bind.apply(fn, args);
  var self = args.shift();
  return function () {
    fn.apply(self, args.concat([Array.prototype.slice.call(arguments)]));
  };
};

// Object.create is supported in IE9
function create(prototype, properties) {
  var object;
  if (prototype === null) {
    object = { '__proto__' : null };
  }
  else {
    if (typeof prototype !== 'object') {
      throw new TypeError(
        'typeof prototype[' + (typeof prototype) + '] != \'object\''
      );
    }
    var Type = function () {};
    Type.prototype = prototype;
    object = new Type();
    object.__proto__ = prototype;
  }
  if (typeof properties !== 'undefined' && Object.defineProperties) {
    Object.defineProperties(object, properties);
  }
  return object;
}
exports.create = typeof Object.create === 'function' ? Object.create : create;

// Object.keys and Object.getOwnPropertyNames is supported in IE9 however
// they do show a description and number property on Error objects
function notObject(object) {
  return ((typeof object != "object" && typeof object != "function") || object === null);
}

function keysShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.keys called on a non-object");
  }

  var result = [];
  for (var name in object) {
    if (hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

// getOwnPropertyNames is almost the same as Object.keys one key feature
//  is that it returns hidden properties, since that can't be implemented,
//  this feature gets reduced so it just shows the length property on arrays
function propertyShim(object) {
  if (notObject(object)) {
    throw new TypeError("Object.getOwnPropertyNames called on a non-object");
  }

  var result = keysShim(object);
  if (exports.isArray(object) && exports.indexOf(object, 'length') === -1) {
    result.push('length');
  }
  return result;
}

var keys = typeof Object.keys === 'function' ? Object.keys : keysShim;
var getOwnPropertyNames = typeof Object.getOwnPropertyNames === 'function' ?
  Object.getOwnPropertyNames : propertyShim;

if (new Error().hasOwnProperty('description')) {
  var ERROR_PROPERTY_FILTER = function (obj, array) {
    if (toString.call(obj) === '[object Error]') {
      array = exports.filter(array, function (name) {
        return name !== 'description' && name !== 'number' && name !== 'message';
      });
    }
    return array;
  };

  exports.keys = function (object) {
    return ERROR_PROPERTY_FILTER(object, keys(object));
  };
  exports.getOwnPropertyNames = function (object) {
    return ERROR_PROPERTY_FILTER(object, getOwnPropertyNames(object));
  };
} else {
  exports.keys = keys;
  exports.getOwnPropertyNames = getOwnPropertyNames;
}

// Object.getOwnPropertyDescriptor - supported in IE8 but only on dom elements
function valueObject(value, key) {
  return { value: value[key] };
}

if (typeof Object.getOwnPropertyDescriptor === 'function') {
  try {
    Object.getOwnPropertyDescriptor({'a': 1}, 'a');
    exports.getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  } catch (e) {
    // IE8 dom element issue - use a try catch and default to valueObject
    exports.getOwnPropertyDescriptor = function (value, key) {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch (e) {
        return valueObject(value, key);
      }
    };
  }
} else {
  exports.getOwnPropertyDescriptor = valueObject;
}

},{}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// UTILITY
var util = require('util');
var shims = require('_shims');
var pSlice = Array.prototype.slice;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  this.message = options.message || getMessage(this);
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = shims.keys(a),
        kb = shims.keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};
},{"_shims":5,"util":7}],7:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var shims = require('_shims');

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  shims.forEach(array, function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = shims.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = shims.getOwnPropertyNames(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }

  shims.forEach(keys, function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = shims.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }

  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (shims.indexOf(ctx.seen, desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = shims.reduce(output, function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return shims.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) && objectToString(e) === '[object Error]';
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return arg instanceof Buffer;
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = shims.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = shims.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

},{"_shims":5}]},{},[])
;;module.exports=require("buffer-browserify")

},{}],71:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],72:[function(require,module,exports){
var Buffer = require('buffer').Buffer
var sha = require('./sha')
var sha256 = require('./sha256')
var rng = require('./rng')
var md5 = require('./md5')

var algorithms = {
  sha1: {
    hex: sha.hex_sha1,
    base64: sha.b64_sha1,
    binary: sha.str_sha1
  },
  sha256: {
    hex: sha256.hex_sha256,
    base64: sha256.b64_sha256,
    binary: sha256.str_sha256
  },
  md5: {
    hex: md5.hex_md5,
    base64: md5.b64_md5,
    binary: md5.bin_md5
  }
}

var algorithmsHmac = {
  sha1: {
    hex: sha.hex_hmac_sha1,
    base64: sha.b64_hmac_sha1,
    binary: sha.str_hmac_sha1
  },
  sha256: {
    hex: sha256.hex_hmac_sha256,
    base64: sha256.b64_hmac_sha256,
    binary: sha256.str_hmac_sha256
  },
  md5: {
    hex: md5.hex_hmac_md5,
    base64: md5.b64_hmac_md5,
    binary: md5.bin_hmac_md5
  }
}


function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/dominictarr/crypto-browserify'
    ].join('\n'))
}

exports.createHash = function (alg) {
  alg = alg || 'sha1'
  if(!algorithms[alg])
    error('algorithm:', alg, 'is not yet supported')
  var s = ''
  var _alg = algorithms[alg]
  return {
    update: function (data) {
      s += data
      return this
    },
    digest: function (enc) {
      enc = enc || 'binary'
      var fn
      if(!(fn = _alg[enc]))
        error('encoding:', enc , 'is not yet supported for algorithm', alg)
      var r = fn(s)
      s = null //not meant to use the hash after you've called digest.
      return r
    }
  }
}

exports.createHmac = function (alg, key) {
  if (!algorithmsHmac[alg])
    error('algorithm:', alg, 'is not yet supported')
  if (typeof key != 'string')
    key = key.toString('binary')
  var s = ''
  var _alg = algorithmsHmac[alg]
  return {
    update: function (data) {
      s += data
      return this
    },
    digest: function (enc) {
      enc = enc || 'binary'
      var fn
      if (!(fn = _alg[enc]))
        error('encoding:', enc, 'is not yet support for algorithm', alg)
      var r = fn(key, s)
      s = null
      return r
    }
  }
}

exports.randomBytes = function(size, callback) {
  if (callback && callback.call) {
    try {
      callback.call(this, undefined, new Buffer(rng(size)));
    } catch (err) { callback(err); }
  } else {
    return new Buffer(rng(size));
  }
}

function each(a, f) {
  for(var i in a)
    f(a[i], i)
}

// the least I can do is make error messages for the rest of the node.js/crypto api.
each(['createCredentials'
, 'createCipher'
, 'createCipheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDiffieHellman'
, 'pbkdf2'], function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

},{"./md5":73,"./rng":74,"./sha":75,"./sha256":76,"buffer":68}],73:[function(require,module,exports){
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "="; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;   /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_md5(s){ return binl2hex(core_md5(str2binl(s), s.length * chrsz));}
function b64_md5(s){ return binl2b64(core_md5(str2binl(s), s.length * chrsz));}
function str_md5(s){ return binl2str(core_md5(str2binl(s), s.length * chrsz));}
function hex_hmac_md5(key, data) { return binl2hex(core_hmac_md5(key, data)); }
function b64_hmac_md5(key, data) { return binl2b64(core_hmac_md5(key, data)); }
function str_hmac_md5(key, data) { return binl2str(core_hmac_md5(key, data)); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function core_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);

}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Calculate the HMAC-MD5, of a key and some data
 */
function core_hmac_md5(key, data)
{
  var bkey = str2binl(key);
  if(bkey.length > 16) bkey = core_md5(bkey, key.length * chrsz);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
  return core_md5(opad.concat(hash), 512 + 128);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert a string to an array of little-endian words
 * If chrsz is ASCII, characters >255 have their hi-byte silently ignored.
 */
function str2binl(str)
{
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (i%32);
  return bin;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2str(bin)
{
  var str = "";
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i>>5] >>> (i % 32)) & mask);
  return str;
}

/*
 * Convert an array of little-endian words to a hex string.
 */
function binl2hex(binarray)
{
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++)
  {
    str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) +
           hex_tab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
  }
  return str;
}

/*
 * Convert an array of little-endian words to a base-64 string
 */
function binl2b64(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3)
  {
    var triplet = (((binarray[i   >> 2] >> 8 * ( i   %4)) & 0xFF) << 16)
                | (((binarray[i+1 >> 2] >> 8 * ((i+1)%4)) & 0xFF) << 8 )
                |  ((binarray[i+2 >> 2] >> 8 * ((i+2)%4)) & 0xFF);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > binarray.length * 32) str += b64pad;
      else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
    }
  }
  return str;
}

exports.hex_md5 = hex_md5;
exports.b64_md5 = b64_md5;
exports.bin_md5 = str_md5;
exports.hex_hmac_md5 = hex_hmac_md5;
exports.b64_hmac_md5 = b64_hmac_md5;
exports.bin_hmac_md5 = str_hmac_md5;

},{}],74:[function(require,module,exports){
// Original code adapted from Robert Kieffer.
// details at https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  var mathRNG, whatwgRNG;

  // NOTE: Math.random() does not guarantee "cryptographic quality"
  mathRNG = function(size) {
    var bytes = new Array(size);
    var r;

    for (var i = 0, r; i < size; i++) {
      if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
      bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return bytes;
  }

  if (_global.crypto && crypto.getRandomValues) {
    var _rnds = new Uint32Array(4);
    whatwgRNG = function(size) {
      var bytes = new Array(size);
      crypto.getRandomValues(_rnds);

      for (var c = 0 ; c < size; c++) {
        bytes[c] = _rnds[c >> 2] >>> ((c & 0x03) * 8) & 0xff;
      }
      return bytes;
    }
  }

  module.exports = whatwgRNG || mathRNG;

}())

},{}],75:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

exports.hex_sha1 = hex_sha1;
exports.b64_sha1 = b64_sha1;
exports.str_sha1 = str_sha1;
exports.hex_hmac_sha1 = hex_hmac_sha1;
exports.b64_hmac_sha1 = b64_hmac_sha1;
exports.str_hmac_sha1 = str_hmac_sha1;

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "="; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;   /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha1(s){return binb2hex(core_sha1(str2binb(s),s.length * chrsz));}
function b64_sha1(s){return binb2b64(core_sha1(str2binb(s),s.length * chrsz));}
function str_sha1(s){return binb2str(core_sha1(str2binb(s),s.length * chrsz));}
function hex_hmac_sha1(key, data){ return binb2hex(core_hmac_sha1(key, data));}
function b64_hmac_sha1(key, data){ return binb2b64(core_hmac_sha1(key, data));}
function str_hmac_sha1(key, data){ return binb2str(core_hmac_sha1(key, data));}

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test()
{
  return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data)
{
  var bkey = str2binb(key);
  if(bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str)
{
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (32 - chrsz - i%32);
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
  var str = "";
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i>>5] >>> (32 - chrsz - i%32)) & mask);
  return str;
}

/*
 * Convert an array of big-endian words to a hex string.
 */
function binb2hex(binarray)
{
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++)
  {
    str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
           hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
  }
  return str;
}

/*
 * Convert an array of big-endian words to a base-64 string
 */
function binb2b64(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3)
  {
    var triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16)
                | (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 )
                |  ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > binarray.length * 32) str += b64pad;
      else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
    }
  }
  return str;
}


},{}],76:[function(require,module,exports){

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

exports.hex_sha256 = hex_sha256;
exports.b64_sha256 = b64_sha256;
exports.str_sha256 = str_sha256;
exports.hex_hmac_sha256 = hex_hmac_sha256;
exports.b64_hmac_sha256 = b64_hmac_sha256;
exports.str_hmac_sha256 = str_hmac_sha256;

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "="; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;   /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha256(s){return binb2hex(core_sha256(str2binb(s),s.length * chrsz));}
function b64_sha256(s){return binb2b64(core_sha256(str2binb(s),s.length * chrsz));}
function str_sha256(s){return binb2str(core_sha256(str2binb(s),s.length * chrsz));}
function hex_hmac_sha256(key, data){ return binb2hex(core_hmac_sha256(key, data));}
function b64_hmac_sha256(key, data){ return binb2b64(core_hmac_sha256(key, data));}
function str_hmac_sha256(key, data){ return binb2str(core_hmac_sha256(key, data));}

var safe_add = function(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
};

var S = function(X, n) {
  return (X >>> n) | (X << (32 - n));
};

var R = function(X, n) {
  return (X >>> n);
};

var Ch = function(x, y, z) {
  return ((x & y) ^ ((~x) & z));
};

var Maj = function(x, y, z) {
  return ((x & y) ^ (x & z) ^ (y & z));
};

var Sigma0256 = function(x) {
  return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
};

var Sigma1256 = function(x) {
  return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
};

var Gamma0256 = function(x) {
  return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
};

var Gamma1256 = function(x) {
  return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
};

var core_sha256 = function(m, l) {
  var K = new Array(0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2);
  var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
    var W = new Array(64);
    var a, b, c, d, e, f, g, h, i, j;
    var T1, T2;
  /* append padding */
  m[l >> 5] |= 0x80 << (24 - l % 32);
  m[((l + 64 >> 9) << 4) + 15] = l;
  for (var i = 0; i < m.length; i += 16) {
    a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
    for (var j = 0; j < 64; j++) {
      if (j < 16) {
        W[j] = m[j + i];
      } else {
        W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
      }
      T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
      T2 = safe_add(Sigma0256(a), Maj(a, b, c));
      h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
    }
    HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
    HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
  }
  return HASH;
};

var str2binb = function(str) {
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for (var i = 0; i < str.length * chrsz; i += chrsz) {
    bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i % 32);
  }
  return bin;
};

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
  var str = "";
  var mask = (1 << chrsz) - 1;
  for (var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i >> 5] >>> (32 - chrsz - i % 32)) & mask);
  return str;
}

var hex2binb = function(a) {
  var b = [], length = a.length, i, num;
  for (i = 0; i < length; i += 2) {
    num = parseInt(a.substr(i, 2), 16);
    if (!isNaN(num)) {
      b[i >> 3] |= num << (24 - (4 * (i % 8)));
    } else {
      return "INVALID HEX STRING";
    }
  }
  return b;
};

var binb2hex = function(binarray) {
  //var hexcase = 0; /* hex output format. 0 - lowercase; 1 - uppercase */
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for (var i = 0; i < binarray.length * 4; i++) {
    str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) + hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
  }
  return str;
};

var binb2b64 = function(a) {
  var b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz" + "0123456789+/", str = "", length = a.length * 4, i, j, triplet;
  var b64pad = "=";
  for (i = 0; i < length; i += 3) {
    triplet = (((a[i >> 2] >> 8 * (3 - i % 4)) & 0xFF) << 16) | (((a[i + 1 >> 2] >> 8 * (3 - (i + 1) % 4)) & 0xFF) << 8) | ((a[i + 2 >> 2] >> 8 * (3 - (i + 2) % 4)) & 0xFF);
    for (j = 0; j < 4; j += 1) {
      if (i * 8 + j * 6 <= a.length * 32) {
        str += b.charAt((triplet >> 6 * (3 - j)) & 0x3F);
      } else {
        str += b64pad;
      }
    }
}
  return str;
};

var core_hmac_sha256 = function(key, data) {
  var bkey = str2binb(key);
  if (bkey.length > 16) {
    bkey = core_sha256(bkey, key.length * chrsz);
  }
  var ipad = Array(16), opad = Array(16);
  for (var i = 0; i < 16; i++) {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }
  var hash = core_sha256(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_sha256(opad.concat(hash), 512 + 256);
};


},{}],77:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var async = require('async');
var request = require('request');

var jxt = require('jxt');
var XRD = require('./lib/xrd');


module.exports = function (opts, cb) {
    if (!cb) return;

    if (typeof opts === 'string') {
        opts = {host: opts};
    }

    opts = _.extend({
        ssl: true,
        json: true,
        xrd: true
    }, opts);

    var scheme = opts.ssl ? 'https://' : 'http://';

    async.parallel({
        json: function (jsonCb) {
            if (!opts.json) return jsonCb(null, {});
            request.get(scheme + opts.host + '/.well-known/host-meta.json', function (err, res) {
                if (err) return jsonCb(null, {});
                var completed, result;
                try {
                    result = JSON.parse(res.body);
                    completed = true;
                } catch (e) {
                    completed = false;
                    result = {};
                }
                jsonCb(completed, result);
            });
        },
        xrd: function (xrdCb) {
            if (!opts.xrd) return xrdCb(null, {});
            var completed, result;
            request.get(scheme + opts.host + '/.well-known/host-meta', function (err, res) {
                if (err) return xrdCb(null, {});
                try {
                    var xrd = jxt.parse(XRD, res.body, 'application/xml');
                    result = xrd.toJSON();
                    completed = true;
                } catch (e) {
                    completed = false;
                    result = {};
                }
                xrdCb(completed, result);
            });
        }
    }, function (completed, data) {
        if (completed) {
            if (data.json && Object.keys(data.json).length) {
                return cb(false, data.json);
            } else if (data.xrd && Object.keys(data.xrd).length) {
                return cb(false, data.xrd);
            }
        } else {
            cb('no-host-meta', {});
        }
    });
};

},{"./lib/xrd":78,"async":62,"jxt":98,"request":79,"underscore":119}],78:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var jxt = require('jxt');


var NS = 'http://docs.oasis-open.org/ns/xri/xrd-1.0';

var Properties = {
    get: function () {
        var results = {};
        var props = jxt.find(this.xml, NS, 'Property');
        _.each(props, function (property) {
            var type = jxt.getAttribute(property, 'type');
            results[type] = property.textContent;
        });
        return results;
    }
};

var XRD = module.exports = jxt.define({
    name: 'xrd',
    namespace: NS,
    element: 'XRD',
    fields: {
        subject: jxt.subText(NS, 'Subject'),
        expires: jxt.dateSub(NS, 'Expires'),
        aliases: jxt.multiSubText(NS, 'Alias'),
        properties: Properties
    }
});


var Link = jxt.define({
    name: 'xrdlink',
    namespace: NS,
    element: 'Link',
    fields: {
        rel: jxt.attribute('rel'),
        href: jxt.attribute('href'),
        type: jxt.attribute('type'),
        template: jxt.attribute('template'),
        titles: jxt.subLangText(NS, 'Title', 'default'),
        properties: Properties
    }
});


jxt.extend(XRD, Link, 'links');

},{"jxt":98,"underscore":119}],79:[function(require,module,exports){
// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var XHR = XMLHttpRequest
if (!XHR) throw new Error('missing XMLHttpRequest')

module.exports = request
request.log = {
  'trace': noop, 'debug': noop, 'info': noop, 'warn': noop, 'error': noop
}

var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

//
// request
//

function request(options, callback) {
  // The entry-point to the API: prep the options object and pass the real work to run_xhr.
  if(typeof callback !== 'function')
    throw new Error('Bad callback given: ' + callback)

  if(!options)
    throw new Error('No options given')

  var options_onResponse = options.onResponse; // Save this for later.

  if(typeof options === 'string')
    options = {'uri':options};
  else
    options = JSON.parse(JSON.stringify(options)); // Use a duplicate for mutating.

  options.onResponse = options_onResponse // And put it back.

  if (options.verbose) request.log = getLogger();

  if(options.url) {
    options.uri = options.url;
    delete options.url;
  }

  if(!options.uri && options.uri !== "")
    throw new Error("options.uri is a required argument");

  if(typeof options.uri != "string")
    throw new Error("options.uri must be a string");

  var unsupported_options = ['proxy', '_redirectsFollowed', 'maxRedirects', 'followRedirect']
  for (var i = 0; i < unsupported_options.length; i++)
    if(options[ unsupported_options[i] ])
      throw new Error("options." + unsupported_options[i] + " is not supported")

  options.callback = callback
  options.method = options.method || 'GET';
  options.headers = options.headers || {};
  options.body    = options.body || null
  options.timeout = options.timeout || request.DEFAULT_TIMEOUT

  if(options.headers.host)
    throw new Error("Options.headers.host is not supported");

  if(options.json) {
    options.headers.accept = options.headers.accept || 'application/json'
    if(options.method !== 'GET')
      options.headers['content-type'] = 'application/json'

    if(typeof options.json !== 'boolean')
      options.body = JSON.stringify(options.json)
    else if(typeof options.body !== 'string')
      options.body = JSON.stringify(options.body)
  }

  // If onResponse is boolean true, call back immediately when the response is known,
  // not when the full request is complete.
  options.onResponse = options.onResponse || noop
  if(options.onResponse === true) {
    options.onResponse = callback
    options.callback = noop
  }

  // XXX Browsers do not like this.
  //if(options.body)
  //  options.headers['content-length'] = options.body.length;

  // HTTP basic authentication
  if(!options.headers.authorization && options.auth)
    options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);

  return run_xhr(options)
}

var req_seq = 0
function run_xhr(options) {
  var xhr = new XHR
    , timed_out = false
    , is_cors = is_crossDomain(options.uri)
    , supports_cors = ('withCredentials' in xhr)

  req_seq += 1
  xhr.seq_id = req_seq
  xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
  xhr._id = xhr.id // I know I will type "_id" from habit all the time.

  if(is_cors && !supports_cors) {
    var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri)
    cors_err.cors = 'unsupported'
    return options.callback(cors_err, xhr)
  }

  xhr.timeoutTimer = setTimeout(too_late, options.timeout)
  function too_late() {
    timed_out = true
    var er = new Error('ETIMEDOUT')
    er.code = 'ETIMEDOUT'
    er.duration = options.timeout

    request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
    return options.callback(er, xhr)
  }

  // Some states can be skipped over, so remember what is still incomplete.
  var did = {'response':false, 'loading':false, 'end':false}

  xhr.onreadystatechange = on_state_change
  xhr.open(options.method, options.uri, true) // asynchronous
  if(is_cors)
    xhr.withCredentials = !! options.withCredentials
  xhr.send(options.body)
  return xhr

  function on_state_change(event) {
    if(timed_out)
      return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

    request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

    if(xhr.readyState === XHR.OPENED) {
      request.log.debug('Request started', {'id':xhr.id})
      for (var key in options.headers)
        xhr.setRequestHeader(key, options.headers[key])
    }

    else if(xhr.readyState === XHR.HEADERS_RECEIVED)
      on_response()

    else if(xhr.readyState === XHR.LOADING) {
      on_response()
      on_loading()
    }

    else if(xhr.readyState === XHR.DONE) {
      on_response()
      on_loading()
      on_end()
    }
  }

  function on_response() {
    if(did.response)
      return

    did.response = true
    request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
    clearTimeout(xhr.timeoutTimer)
    xhr.statusCode = xhr.status // Node request compatibility

    // Detect failed CORS requests.
    if(is_cors && xhr.statusCode == 0) {
      var cors_err = new Error('CORS request rejected: ' + options.uri)
      cors_err.cors = 'rejected'

      // Do not process this request further.
      did.loading = true
      did.end = true

      return options.callback(cors_err, xhr)
    }

    options.onResponse(null, xhr)
  }

  function on_loading() {
    if(did.loading)
      return

    did.loading = true
    request.log.debug('Response body loading', {'id':xhr.id})
    // TODO: Maybe simulate "data" events by watching xhr.responseText
  }

  function on_end() {
    if(did.end)
      return

    did.end = true
    request.log.debug('Request done', {'id':xhr.id})

    xhr.body = xhr.responseText
    if(options.json) {
      try        { xhr.body = JSON.parse(xhr.responseText) }
      catch (er) { return options.callback(er, xhr)        }
    }

    options.callback(null, xhr, xhr.body)
  }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

//
// defaults
//

request.defaults = function(options, requester) {
  var def = function (method) {
    var d = function (params, callback) {
      if(typeof params === 'string')
        params = {'uri': params};
      else {
        params = JSON.parse(JSON.stringify(params));
      }
      for (var i in options) {
        if (params[i] === undefined) params[i] = options[i]
      }
      return method(params, callback)
    }
    return d
  }
  var de = def(request)
  de.get = def(request.get)
  de.post = def(request.post)
  de.put = def(request.put)
  de.head = def(request.head)
  return de
}

//
// HTTP method shortcuts
//

var shortcuts = [ 'get', 'put', 'post', 'head' ];
shortcuts.forEach(function(shortcut) {
  var method = shortcut.toUpperCase();
  var func   = shortcut.toLowerCase();

  request[func] = function(opts) {
    if(typeof opts === 'string')
      opts = {'method':method, 'uri':opts};
    else {
      opts = JSON.parse(JSON.stringify(opts));
      opts.method = method;
    }

    var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
    return request.apply(this, args);
  }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
  if(typeof options === 'string')
    options = {'uri':options}

  // Just use the request API to do JSON.
  options.json = true
  if(options.body)
    options.json = options.body
  delete options.body

  callback = callback || noop

  var xhr = request(options, couch_handler)
  return xhr

  function couch_handler(er, resp, body) {
    if(er)
      return callback(er, resp, body)

    if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
      // The body is a Couch JSON object indicating the error.
      er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
      for (var key in body)
        er[key] = body[key]
      return callback(er, resp, body);
    }

    return callback(er, resp, body);
  }
}

//
// Utility
//

function noop() {}

function getLogger() {
  var logger = {}
    , levels = ['trace', 'debug', 'info', 'warn', 'error']
    , level, i

  for(i = 0; i < levels.length; i++) {
    level = levels[i]

    logger[level] = noop
    if(typeof console !== 'undefined' && console && console[level])
      logger[level] = formatted(console, level)
  }

  return logger
}

function formatted(obj, method) {
  return formatted_logger

  function formatted_logger(str, context) {
    if(typeof context === 'object')
      str += ' ' + JSON.stringify(context)

    return obj[method].call(obj, str)
  }
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
  var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/

  // jQuery #8138, IE may throw an exception when accessing
  // a field from window.location if document.domain has been set
  var ajaxLocation
  try { ajaxLocation = location.href }
  catch (e) {
    // Use the href attribute of an A element since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
  }

  var ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
    , parts = rurl.exec(url.toLowerCase() )

  var result = !!(
    parts &&
    (  parts[1] != ajaxLocParts[1]
    || parts[2] != ajaxLocParts[2]
    || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
    )
  )

  //console.debug('is_crossDomain('+url+') -> ' + result)
  return result
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
        break;
        case 2:
            enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
}

},{}],80:[function(require,module,exports){
module.exports = require('./lib/sessionManager');

},{"./lib/sessionManager":83}],81:[function(require,module,exports){
var bows = require('bows');
var async = require('async');
var WildEmitter = require('wildemitter');
var JinglePeerConnection = require('jingle-rtcpeerconnection');
var JingleJSON = require('sdp-jingle-json');


var log = bows('JingleSession');


function actionToMethod(action) {
    var words = action.split('-');
    return 'on' + words[0][0].toUpperCase() + words[0].substr(1) + words[1][0].toUpperCase() + words[1].substr(1);
}


function JingleSession(opts) {
    var self = this;
    this.sid = opts.sid || Date.now().toString();
    this.peer = opts.peer;
    this.isInitiator = opts.initiator || false;
    this.state = 'starting';
    this.parent = opts.parent;

    this.processingQueue = async.queue(function (task, next) {
        var action  = task.action;
        var changes = task.changes;
        var cb = task.cb;

        log(self.sid + ': ' + action);
        self[action](changes, function (err) {
            cb(err);
            next();
        });
    });
}

JingleSession.prototype = Object.create(WildEmitter.prototype, {
    constructor: {
        value: JingleSession
    }
});


JingleSession.prototype.process = function (action, changes, cb) {
    var self = this;

    var method = actionToMethod(action);

    this.processingQueue.push({
        action: method,
        changes: changes,
        cb: cb
    });
};

JingleSession.prototype.send = function (type, data) {
    data = data || {};
    data.sid = this.sid;
    data.action = type;
    this.parent.emit('send', {
        to: this.peer,
        type: 'set',
        jingle: data
    });
};

Object.defineProperty(JingleSession.prototype, 'state', {
    get: function () {
        return this._state;
    },
    set: function (value) {
        var validStates = {
            starting: true,
            pending: true,
            active: true,
            ended: true
        };

        if (!validStates[value]) {
            throw new Error('Invalid Jingle Session State: ' + value);
        }

        if (this._state !== value) {
            this._state = value;
            log(this.sid + ': State changed to ' + value);
        }
    }
});
Object.defineProperty(JingleSession.prototype, 'starting', {
    get: function () {
        return this._state == 'starting';
    }
});
Object.defineProperty(JingleSession.prototype, 'pending', {
    get: function () {
        return this._state == 'pending';
    }
});
Object.defineProperty(JingleSession.prototype, 'active', {
    get: function () {
        return this._state == 'active';
    }
});
Object.defineProperty(JingleSession.prototype, 'ended', {
    get: function () {
        return this._state == 'ended';
    }
});

JingleSession.prototype.start = function () {
    this.state = 'pending';
    log(this.sid + ': Can not start generic session');
};
JingleSession.prototype.end = function (reason, silence) {
    this.parent.peers[this.peer].splice(this.parent.peers[this.peer].indexOf(this), 1);
    delete this.parent.sessions[this.sid];

    this.state = 'ended';

    reason = reason || {};

    if (!silence) {
        this.send('session-terminate', {reason: reason});
    }

    this.parent.emit('terminated', this, reason);
};

var actions = [
    'content-accept', 'content-add', 'content-modify',
    'conent-reject', 'content-remove', 'description-info',
    'session-accept', 'session-info', 'session-initiate',
    'session-terminate', 'transport-accept', 'transport-info',
    'transport-reject', 'transport-replace'
];

actions.forEach(function (action) {
    var method = actionToMethod(action);
    JingleSession.prototype[method] = function (changes, cb) {
        log(this.sid + ': Unsupported action ' + action);
        cb();
    };
});

module.exports = JingleSession;

},{"async":62,"bows":84,"jingle-rtcpeerconnection":88,"sdp-jingle-json":93,"wildemitter":120}],82:[function(require,module,exports){
var _ = require('underscore');
var bows = require('bows');
var JingleSession = require('./genericSession');
var JinglePeerConnection = require('jingle-rtcpeerconnection');


var log = bows('JingleMedia');


function MediaSession(opts) {
    JingleSession.call(this, opts);

    var self = this;

    this.pc = new JinglePeerConnection(this.parent.config.peerConnectionConfig,
                                       this.parent.config.peerConnectionConstraints);
    this.pc.on('ice', this.onIceCandidate.bind(this));
    this.pc.on('addStream', this.onStreamAdded.bind(this));
    this.pc.on('removeStream', this.onStreamRemoved.bind(this));
    this.pendingAnswer = null;

    if (this.parent.localStream) {
        this.pc.addStream(this.parent.localStream);
        this.localStream = this.parent.localStream;
    } else {
        this.parent.once('localStream', function (stream) {
            self.pc.addStream(stream);
            this.localStream = stream;
        });
    }

    this.stream = null;
}

MediaSession.prototype = Object.create(JingleSession.prototype, {
    constructor: {
        value: MediaSession
    }
});

MediaSession.prototype = _.extend(MediaSession.prototype, {
    start: function () {
        var self = this;
        this.state = 'pending';
        this.pc.isInitiator = true;
        this.pc.offer(function (err, sessDesc) {
            self.send('session-initiate', sessDesc.json);
        });
    },
    end: function (reason) {
        this.pc.close();
        this.onStreamRemoved();
        JingleSession.prototype.end.call(this, reason);
    },
    accept: function () {
        log(this.sid + ': Accepted incoming session');
        this.state = 'active';
        this.send('session-accept', this.pendingAnswer);
    },
    ring: function () {
        log(this.sid + ': Ringing on incoming session');
        this.send('session-info', {ringing: true});
    },
    mute: function (creator, name) {
        log(this.sid + ': Muting');
        this.send('session-info', {mute: {creator: creator, name: name}});
    },
    unmute: function (creator, name) {
        log(this.sid + ': Unmuting');
        this.send('session-info', {unmute: {creator: creator, name: name}});
    },
    hold: function () {
        log(this.sid + ': Placing on hold');
        this.send('session-info', {hold: true});
    },
    resume: function () {
        log(this.sid + ': Resuing from hold');
        this.send('session-info', {active: true});
    },
    onSessionInitiate: function (changes, cb) {
        log(this.sid + ': Initiating incoming session');
        var self = this;
        this.state = 'pending';
        this.pc.isInitiator = false;
        this.pc.answer({type: 'offer', json: changes}, function (err, answer) {
            if (err) {
                log(self.sid + ': Could not create WebRTC answer', err);
                return cb({condition: 'general-error'});
            }
            self.pendingAnswer = answer.json;
            cb();
        });
    },
    onSessionAccept: function (changes, cb) {
        var self = this;
        log(this.sid + ': Activating accepted outbound session');
        this.state = 'active';
        this.pc.handleAnswer({type: 'answer', json: changes}, function (err) {
            if (err) {
                log(self.sid + ': Could not process WebRTC answer', err);
                return cb({condition: 'general-error'});
            }

            self.parent.emit('accepted', self);
            cb();
        });
    },
    onSessionTerminate: function (changes, cb) {
        log(this.sid + ': Terminating session');
        this.pc.close();
        this.onStreamRemoved();
        JingleSession.prototype.end.call(this, changes.reason, true);
        cb();
    },
    onTransportInfo: function (changes, cb) {
        var self = this;
        log(this.sid + ': Adding ICE candidate');
        this.pc.processIce(changes, function (err) {
            if (err) {
                log(self.sid + ': Could not process ICE candidate', err);
            }
            cb();
        });
    },
    onSessionInfo: function (info, cb) {
        log(info);
        if (info.ringing) {
            log(this.sid + ': Ringing on remote stream');
            this.parent.emit('ringing', this);
        }

        if (info.hold) {
            log(this.sid + ': On hold');
            this.parent.emit('hold', this);
        }

        if (info.active) {
            log(this.sid + ': Resumed from hold');
            this.parent.emit('resumed', this);
        }

        if (info.mute) {
            log(this.sid + ': Muted', info.mute);
            this.parent.emit('mute', this, info.mute);
        }

        if (info.unmute) {
            log(this.sid + ': Unmuted', info.unmute);
            this.parent.emit('unmute', this, info.unmute);
        }

        cb();
    },
    onIceCandidate: function (candidateInfo) {
        log(this.sid + ': Discovered new ICE candidate', candidateInfo);
        this.send('transport-info', candidateInfo);
    },
    onStreamAdded: function (event) {
        if (this.stream) {
            log(this.sid + ': Received remote stream, but one already exists');
        } else {
            log(this.sid + ': Remote media stream added');
            this.stream = event.stream;
            this.parent.emit('peerStreamAdded', this);
        }
    },
    onStreamRemoved: function () {
        log(this.sid + ': Remote media stream removed');
        this.parent.emit('peerStreamRemoved', this);
    }
});


module.exports = MediaSession;

},{"./genericSession":81,"bows":84,"jingle-rtcpeerconnection":88,"underscore":119}],83:[function(require,module,exports){
var _ = require('underscore');
var bows = require('bows');
var hark = require('hark');
var webrtc = require('webrtcsupport');
var mockconsole = require('mockconsole');
var getUserMedia = require('getusermedia');
var JinglePeerConnection = require('jingle-rtcpeerconnection');
var WildEmitter = require('wildemitter');
var GainController = require('mediastream-gain');

var GenericSession = require('./genericSession');
var MediaSession = require('./mediaSession');


var log = bows('Jingle');


function Jingle(opts) {
    var self = this;
    opts = opts || {};
    var config = this.config = {
        debug: false,
        peerConnectionConfig: {
            iceServers: [{"url": "stun:stun.l.google.com:19302"}]
        },
        peerConnectionConstraints: {
            optional: [
                {DtlsSrtpKeyAgreement: true},
                {RtpDataChannels: false}
            ]
        },
        autoAdjustMic: false,
        media: {
            audio: true,
            video: true
        }
    };

    this.MediaSession = MediaSession;
    this.jid = opts.jid;
    this.sessions = {};
    this.peers = {};

    this.screenSharingSupport = webrtc.screenSharing;

    for (var item in opts) {
        config[item] = opts[item];
    }

    this.capabilities = [
        'urn:xmpp:jingle:1'
    ];
    if (webrtc.support) {
        this.capabilities = [
            'urn:xmpp:jingle:1',
            'urn:xmpp:jingle:apps:rtp:1',
            'urn:xmpp:jingle:apps:rtp:audio',
            'urn:xmpp:jingle:apps:rtp:video',
            'urn:xmpp:jingle:apps:rtp:rtcb-fb:0',
            'urn:xmpp:jingle:apps:dtls:0',
            'urn:xmpp:jingle:transports:ice-udp:1',
            'urn:ietf:rfc:3264'
        ];
    } else {
        log('WebRTC not supported');
    }

    WildEmitter.call(this);

    if (this.config.debug) {
        this.on('*', function (event, val1, val2) {
            log(event, val1, val2);
        });
    }
}

Jingle.prototype = Object.create(WildEmitter.prototype, {
    constructor: {
        value: Jingle
    }
});

Jingle.prototype.startLocalMedia = function (mediaConstraints, cb) {
    var self = this;
    var constraints = mediaConstraints || {video: true, audio: true};

    getUserMedia(constraints, function (err, stream) {
        if (!err) {
            if (constraints.audio && self.config.detectSpeakingEvents) {
                self.setupAudioMonitor(stream);
            }
            self.localStream = stream;

            if (self.config.autoAdjustMic) {
                self.gainController = new GainController(stream);
                self.setMicIfEnabled(0.5);
            }

            log('Local media stream started');
            self.emit('localStream', stream);
        } else {
            log('Could not start local media');
        }
        if (cb) cb(err, stream);
    });
};

Jingle.prototype.stopLocalMedia = function () {
    if (this.localStream) {
        this.localStream.stop();
        this.emit('localStreamStopped');
    }
};

Jingle.prototype.setupAudioMonitor = function (stream) {
    log('Setup audio');
    var audio = hark(stream);
    var self = this;
    var timeout;

    audio.on('speaking', function () {
        if (self.hardMuted) return;
        self.setMicIfEnabled(1);
        self.emit('speaking');
    });

    audio.on('stopped_speaking', function () {
        if (self.hardMuted) return;
        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(function () {
            self.setMicIfEnabled(0.5);
            self.emit('stoppedSpeaking');
        }, 1000);
    });
};

Jingle.prototype.setMicIfEnabled = function (volume) {
    if (!this.config.autoAdjustMic) return;
    this.gainController.setGain(volume);
};

Jingle.prototype.sendError = function (to, id, data) {
    data.type = 'cancel';
    this.emit('send', {
        to: to,
        id: id,
        type: 'error',
        error: data
    });
};

Jingle.prototype.process = function (req) {
    var self = this;

    if (req.type === 'error') {
        return this.emit('error', req);
    }

    if (req.type === 'result') {
        return;
    }

    var sids, currsid, sess;
    var sid = req.jingle.sid;
    var action = req.jingle.action;
    var contents = req.jingle.contents || [];
    var contentTypes = _.map(contents, function (content) {
        return (content.description || {}).descType;
    });

    var session = this.sessions[sid] || null;

    var sender = req.from.full || req.from;
    var reqid = req.id;

    if (action !== 'session-initiate') {
        // Can't modify a session that we don't have.
        if (!session) {
            log('Unknown session', sid);
            return this.sendError(sender, reqid, {
                condition: 'item-not-found',
                jingleCondition: 'unknown-session'
            });
        }

        // Check if someone is trying to hijack a session.
        if (session.peer !== sender || session.ended) {
            log('Session has ended, or action has wrong sender');
            return this.sendError(sender, reqid, {
                condition: 'item-not-found',
                jingleCondition: 'unknown-session'
            });
        }

        // Can't accept a session twice
        if (action === 'session-accept' && !session.pending) {
            log('Tried to accept session twice', sid);
            return this.sendError(sender, reqid, {
                condition: 'unexpected-request',
                jingleCondition: 'out-of-order'
            });
        }

        // Can't process two requests at once, need to tie break
        if (action !== 'session-terminate' && session.pendingAction) {
            log('Tie break during pending request');
            if (session.isInitiator) {
                return this.sendError(sender, reqid, {
                    condition: 'conflict',
                    jingleCondition: 'tie-break'
                });
            }
        }
    } else if (session) {
        // Don't accept a new session if we already have one.
        if (session.peer !== sender) {
            log('Duplicate sid from new sender');
            return this.sendError(sender, reqid, {
                condition: 'service-unavailable'
            });
        }

        // Check if we need to have a tie breaker because both parties
        // happened to pick the same random sid.
        if (session.pending) {
            if (this.jid > session.peer) {
                log('Tie break new session because of duplicate sids');
                return this.sendError(sender, reqid, {
                    condition: 'conflict',
                    jingleCondition: 'tie-break'
                });
            }
        }

        // The other side is just doing it wrong.
        log('Someone is doing this wrong');
        return this.sendError(sender, reqid, {
            condition: 'unexpected-request',
            jingleCondition: 'out-of-order'
        });
    } else if (Object.keys(this.peers[sender] || {}).length) {
        // Check if we need to have a tie breaker because we already have 
        // a different session that is using the requested content types.
        sids = Object.keys(this.peers[sender]);
        for (var i = 0; i < sids.length; i++) {
            currsid = sids[i];
            sess = this.sessions[currsid];
            if (sess.pending) {
                if (_.intersection(contentTypes, sess.contentTypes).length) {
                    // We already have a pending session request for this content type.
                    if (currsid > sid) {
                        // We won the tie breaker
                        log('Tie break');
                        return this.sendError(sender, reqid, {
                            condition: 'conflict',
                            jingleCondition: 'tie-break'
                        });
                    }
                }
            }
        }
    }

    if (action === 'session-initiate') {
        var opts = {
            sid: sid,
            peer: sender,
            initiator: false,
            parent: this
        };
        if (contentTypes.indexOf('rtp') >= 0) {
            session = new MediaSession(opts);
        } else {
            session = new GenericSession(opts);
        }

        this.sessions[sid] = session;
        if (!this.peers[sender]) {
            this.peers[sender] = [];
        }
        this.peers[sender].push(session);
    }

    session.process(action, req.jingle, function (err) {
        if (err) {
            log('Could not process request', req, err);
            self.sendError(sender, reqid, err);
        } else {
            self.emit('send', {to: sender, id: reqid, type: 'result'});
            if (action === 'session-initiate') {
                log('Incoming session request from ', sender, session);
                self.emit('incoming', session);
            }
        }
    });
};

Jingle.prototype.createMediaSession = function (peer, sid) {
    var session = new MediaSession({
        sid: sid,
        peer: peer,
        initiator: true,
        parent: this
    });

    sid = session.sid;

    this.sessions[sid] = session;
    if (!this.peers[peer]) {
        this.peers[peer] = [];
    }
    this.peers[peer].push(session);

    log('Outgoing session', session.sid, session);
    this.emit('outgoing', session);
    return session;
};

Jingle.prototype.endPeerSessions = function (peer) {
    log('Ending all sessions with', peer);
    var sessions = this.peers[peer] || [];
    sessions.forEach(function (session) {
        session.end();
    });
};


module.exports = Jingle;

},{"./genericSession":81,"./mediaSession":82,"bows":84,"getusermedia":86,"hark":87,"jingle-rtcpeerconnection":88,"mediastream-gain":90,"mockconsole":92,"underscore":119,"webrtcsupport":97,"wildemitter":120}],84:[function(require,module,exports){
(function() {
  var inNode = typeof window === 'undefined',
      ls = !inNode && window.localStorage,
      debug = ls.debug,
      logger = require('andlog'),
      goldenRatio = 0.618033988749895,
      hue = 0,
      padLength = 15,
      noop = function() {},
      yieldColor,
      bows,
      debugRegex;

  yieldColor = function() {
    hue += goldenRatio;
    hue = hue % 1;
    return hue * 360;
  };

  var debugRegex = debug && debug[0]==='/' && new RegExp(debug.substring(1,debug.length-1));

  bows = function(str) {
    var msg;
    msg = "%c" + (str.slice(0, padLength));
    msg += Array(padLength + 3 - msg.length).join(' ') + '|';

    if (debugRegex && !str.match(debugRegex)) return noop;
    if (!window.chrome) return logger.log.bind(logger, msg);
    return logger.log.bind(logger, msg, "color: hsl(" + (yieldColor()) + ",99%,40%); font-weight: bold");
  };

  bows.config = function(config) {
    if (config.padLength) {
      return padLength = config.padLength;
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = bows;
  } else {
    window.bows = bows;
  }
}).call();

},{"andlog":85}],85:[function(require,module,exports){
// follow @HenrikJoreteg and @andyet if you like this ;)
(function () {
    var inNode = typeof window === 'undefined',
        ls = !inNode && window.localStorage,
        out = {};

    if (inNode) {
        module.exports = console;
        return;
    }

    if (ls && ls.debug && window.console) {
        out = window.console;
    } else {
        var methods = "assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),
            l = methods.length,
            fn = function () {};

        while (l--) {
            out[methods[l]] = fn;
        }
    }
    if (typeof exports !== 'undefined') {
        module.exports = out;
    } else {
        window.console = out;
    }
})();

},{}],86:[function(require,module,exports){
// getUserMedia helper by @HenrikJoreteg
var func = (navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);


module.exports = function (constraints, cb) {
    var options;
    var haveOpts = arguments.length === 2;
    var defaultOpts = {video: true, audio: true};
    var error;
    var denied = 'PERMISSION_DENIED';
    var notSatified = 'CONSTRAINT_NOT_SATISFIED';

    // make constraints optional
    if (!haveOpts) {
        cb = constraints;
        constraints = defaultOpts;
    }

    // treat lack of browser support like an error
    if (!func) {
        // throw proper error per spec
        error = new Error('NavigatorUserMediaError');
        error.name = 'NOT_SUPPORTED_ERROR';
        return cb(error);
    }

    func.call(navigator, constraints, function (stream) {
        cb(null, stream);
    }, function (err) {
        var error;
        // coerce into an error object since FF gives us a string
        // there are only two valid names according to the spec
        // we coerce all non-denied to "constraint not satisfied".
        if (typeof err === 'string') {
            error = new Error('NavigatorUserMediaError');
            if (err === denied) {
                error.name = denied;
            } else {
                error.name = notSatified;
            }
        } else {
            // if we get an error object make sure '.name' property is set
            // according to spec: http://dev.w3.org/2011/webrtc/editor/getusermedia.html#navigatorusermediaerror-and-navigatorusermediaerrorcallback
            error = err;
            if (!error.name) {
                // this is likely chrome which
                // sets a property called "ERROR_DENIED" on the error object
                // if so we make sure to set a name
                if (error[denied]) {
                    err.name = denied;
                } else {
                    err.name = notSatified;
                }
            }
        }

        cb(error);
    });
};

},{}],87:[function(require,module,exports){
var WildEmitter = require('wildemitter');

function getMaxVolume (analyser, fftBins) {
  var maxVolume = -Infinity;
  analyser.getFloatFrequencyData(fftBins);

  for(var i=0, ii=fftBins.length; i < ii; i++) {
    if (fftBins[i] > maxVolume && fftBins[i] < 0) {
      maxVolume = fftBins[i];
    }
  };

  return maxVolume;
}


module.exports = function(stream, options) {
  var harker = new WildEmitter();

  // make it not break in non-supported browsers
  if (!window.webkitAudioContext) return harker;

  //Config
  var options = options || {},
      smoothing = (options.smoothing || 0.5),
      interval = (options.interval || 100),
      threshold = options.threshold,
      play = options.play;

  //Setup Audio Context
  var audioContext = new webkitAudioContext();
  var sourceNode, fftBins, analyser;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = smoothing;
  fftBins = new Float32Array(analyser.fftSize);

  if (stream.jquery) stream = stream[0];
  if (stream instanceof HTMLAudioElement) {
    //Audio Tag
    sourceNode = audioContext.createMediaElementSource(stream);
    if (typeof play === 'undefined') play = true;
    threshold = threshold || -65;
  } else {
    //WebRTC Stream
    sourceNode = audioContext.createMediaStreamSource(stream);
    threshold = threshold || -45;
  }

  sourceNode.connect(analyser);
  if (play) analyser.connect(audioContext.destination);

  harker.speaking = false;

  harker.setThreshold = function(t) {
    threshold = t;
  };

  harker.setInterval = function(i) {
    interval = i;
  };

  // Poll the analyser node to determine if speaking
  // and emit events if changed
  var looper = function() {
    setTimeout(function() {
      var currentVolume = getMaxVolume(analyser, fftBins);

      harker.emit('volume_change', currentVolume, threshold);

      if (currentVolume > threshold) {
        if (!harker.speaking) {
          harker.speaking = true;
          harker.emit('speaking');
        }
      } else {
        if (harker.speaking) {
          harker.speaking = false;
          harker.emit('stopped_speaking');
        }
      }

      looper();
    }, interval);
  };
  looper();


  return harker;
}

},{"wildemitter":120}],88:[function(require,module,exports){
var _ = require('underscore');
var webrtc = require('webrtcsupport');
var PeerConnection = require('rtcpeerconnection');
var JingleJSON = require('sdp-jingle-json');


function JinglePeerConnection(config, constraints) {
    this.sid = '';
    this.sdpSessId = Date.now();
    this.isInitiator = true;

    this.localDescription = {contents: []};
    this.remoteDescription = {contents: []};

    PeerConnection.call(this, config, constraints);
}

JinglePeerConnection.prototype = Object.create(PeerConnection.prototype, {
    constructor: {
        value: JinglePeerConnection
    }
});


// Generate and emit an offer with the given constraints
JinglePeerConnection.prototype.offer = function (constraints, cb) {
    var self = this;
    var hasConstraints = arguments.length === 2;
    var mediaConstraints = hasConstraints ? constraints : {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };
    var callback = hasConstraints ? cb : constraints;

    // Actually generate the offer
    this.pc.createOffer(
        function (offer) {
            offer.sdp = self._applySdpHack(offer.sdp);
            self.pc.setLocalDescription(offer);
            var json = JingleJSON.toSessionJSON(offer.sdp, self.isInitiator ? 'initiator' : 'responder');
            json.sid = this.sid;
            self.localDescription = json;
            var expandedOffer = {
                type: 'offer',
                sdp: offer.sdp,
                json: json
            };
            self.emit('offer', expandedOffer);
            if (callback) callback(null, expandedOffer);
        },
        function (err) {
            self.emit('error', err);
            if (callback) callback(err);
        },
        mediaConstraints
    );
};


// Process an answer
PeerConnection.prototype.handleAnswer = function (answer, cb) {
    cb = cb || function () {};
    var self = this;
    answer.sdp = JingleJSON.toSessionSDP(answer.json, this.sdpSessId);
    self.remoteDescription = answer.json;
    this.pc.setRemoteDescription(
        new webrtc.SessionDescription(answer),
        function () {
            cb(null);
        },
        function (err) {
            cb(err);
        }
    );
};

// Internal code sharing for various types of answer methods
JinglePeerConnection.prototype._answer = function (offer, constraints, cb) {
    cb = cb || function () {};
    var self = this;
    offer.sdp = JingleJSON.toSessionSDP(offer.json, self.sdpSessId);
    self.remoteDescription = offer.json;
    this.pc.setRemoteDescription(new webrtc.SessionDescription(offer), function () {
        self.pc.createAnswer(
            function (answer) {
                answer.sdp = self._applySdpHack(answer.sdp);
                self.pc.setLocalDescription(answer);
                var json = JingleJSON.toSessionJSON(answer.sdp);
                json.sid = self.sid;
                self.localDescription = json;
                var expandedAnswer = {
                    type: 'answer',
                    sdp: answer.sdp,
                    json: json
                };
                self.emit('answer', expandedAnswer);
                if (cb) cb(null, expandedAnswer);
            }, function (err) {
                self.emit('error', err);
                if (cb) cb(err);
            },
            constraints
        );
    }, function (err) {
        cb(err);
    });
};


// Init and add ice candidate object with correct constructor
JinglePeerConnection.prototype.processIce = function (update, cb) {
    cb = cb || function () {};

    var self = this;

    var contentNames = _.map(this.remoteDescription.contents, function (content) {
        return content.name;
    });

    var contents = update.contents || [];
    contents.forEach(function (content) {
        var transport = content.transport || {};
        var candidates = transport.candidates || [];

        var mline = contentNames.indexOf(content.name);
        var mid = content.name;

        candidates.forEach(function (candidate) {
            var iceCandidate = JingleJSON.toCandidateSDP(candidate) + '\r\n';
            var iceData = {
                candidate: iceCandidate,
                sdpMLineIndex: mline,
                sdpMid: mid
            };
            self.pc.addIceCandidate(new webrtc.IceCandidate(iceData));
        });
    });
    cb();
};


// Internal method for emitting ice candidates on our peer object
JinglePeerConnection.prototype._onIce = function (event) {
    var self = this;
    if (event.candidate) {
        var ice = event.candidate;
        this.emit('ice', {
            contents: [{
                name: ice.sdpMid,
                creator: self.isInitiator ? 'initiator' : 'responder',
                transport: {
                    transType: 'iceUdp',
                    candidates: [
                        JingleJSON.toCandidateJSON(ice.candidate)
                    ]
                }
            }]
        });
    } else {
        this.emit('endOfCandidates');
    }
};


module.exports = JinglePeerConnection;

},{"rtcpeerconnection":89,"sdp-jingle-json":93,"underscore":119,"webrtcsupport":97}],89:[function(require,module,exports){
var WildEmitter = require('wildemitter');
var webrtc = require('webrtcsupport');


function PeerConnection(config, constraints) {
    var item;
    this.pc = new webrtc.PeerConnection(config, constraints);
    WildEmitter.call(this);

    // proxy some events directly
    this.pc.onremovestream = this.emit.bind(this, 'removeStream');
    this.pc.onnegotiationneeded = this.emit.bind(this, 'negotiationNeeded');
    this.pc.oniceconnectionstatechange = this.emit.bind(this, 'iceConnectionStateChange');
    this.pc.onsignalingstatechange = this.emit.bind(this, 'signalingStateChange');

    // handle incoming ice and data channel events
    this.pc.onaddstream = this._onAddStream.bind(this);
    this.pc.onicecandidate = this._onIce.bind(this);
    this.pc.ondatachannel = this._onDataChannel.bind(this);

    // whether to use SDP hack for faster data transfer
    this.config = {
        debug: false,
        sdpHack: true
    };

    // apply our config
    for (item in config) {
        this.config[item] = config[item];
    }

    if (this.config.debug) {
        this.on('*', function (eventName, event) {
            var logger = config.logger || console;
            logger.log('PeerConnection event:', arguments);
        });
    }
}

PeerConnection.prototype = Object.create(WildEmitter.prototype, {
    constructor: {
        value: PeerConnection
    }
});

// Add a stream to the peer connection object
PeerConnection.prototype.addStream = function (stream) {
    this.localStream = stream;
    this.pc.addStream(stream);
};


// Init and add ice candidate object with correct constructor
PeerConnection.prototype.processIce = function (candidate) {
    this.pc.addIceCandidate(new webrtc.IceCandidate(candidate));
};

// Generate and emit an offer with the given constraints
PeerConnection.prototype.offer = function (constraints, cb) {
    var self = this;
    var hasConstraints = arguments.length === 2;
    var mediaConstraints = hasConstraints ? constraints : {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };
    var callback = hasConstraints ? cb : constraints;

    // Actually generate the offer
    this.pc.createOffer(
        function (offer) {
            offer.sdp = self._applySdpHack(offer.sdp);
            self.pc.setLocalDescription(offer);
            self.emit('offer', offer);
            if (callback) callback(null, offer);
        },
        function (err) {
            self.emit('error', err);
            if (callback) callback(err);
        },
        mediaConstraints
    );
};

// Answer an offer with audio only
PeerConnection.prototype.answerAudioOnly = function (offer, cb) {
    var mediaConstraints = {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: false
            }
        };
    this._answer(offer, mediaConstraints, cb);
};

// Answer an offer without offering to recieve
PeerConnection.prototype.answerBroadcastOnly = function (offer, cb) {
    var mediaConstraints = {
            mandatory: {
                OfferToReceiveAudio: false,
                OfferToReceiveVideo: false
            }
        };
    this._answer(offer, mediaConstraints, cb);
};

// Answer an offer with given constraints default is audio/video
PeerConnection.prototype.answer = function (offer, constraints, cb) {
    var self = this;
    var hasConstraints = arguments.length === 3;
    var callback = hasConstraints ? cb : constraints;
    var mediaConstraints = hasConstraints ? constraints : {
            mandatory: {
                OfferToReceiveAudio: true,
                OfferToReceiveVideo: true
            }
        };

    this._answer(offer, mediaConstraints, callback);
};

// Process an answer
PeerConnection.prototype.handleAnswer = function (answer) {
    this.pc.setRemoteDescription(new webrtc.SessionDescription(answer));
};

// Close the peer connection
PeerConnection.prototype.close = function () {
    this.pc.close();
    this.emit('close');
};

// Internal code sharing for various types of answer methods
PeerConnection.prototype._answer = function (offer, constraints, cb) {
    var self = this;
    this.pc.setRemoteDescription(new webrtc.SessionDescription(offer));
    this.pc.createAnswer(
        function (answer) {
            answer.sdp = self._applySdpHack(answer.sdp);
            self.pc.setLocalDescription(answer);
            self.emit('answer', answer);
            if (cb) cb(null, answer);
        }, function (err) {
            self.emit('error', err);
            if (cb) cb(err);
        },
        constraints
    );
};

// Internal method for emitting ice candidates on our peer object
PeerConnection.prototype._onIce = function (event) {
    if (event.candidate) {
        this.emit('ice', event.candidate);
    } else {
        this.emit('endOfCandidates');
    }
};

// Internal method for processing a new data channel being added by the
// other peer.
PeerConnection.prototype._onDataChannel = function (event) {
    this.emit('addChannel', event.channel);
};

// Internal handling of adding stream
PeerConnection.prototype._onAddStream = function (event) {
    this.remoteStream = event.stream;
    this.emit('addStream', event);
};

// SDP hack for increasing AS (application specific) data transfer speed allowed in chrome
PeerConnection.prototype._applySdpHack = function (sdp) {
    if (!this.config.sdpHack) return sdp;
    var parts = sdp.split('b=AS:30');
    if (parts.length === 2) {
        // increase max data transfer bandwidth to 100 Mbps
        return parts[0] + 'b=AS:102400' + parts[1];
    } else {
        return sdp;
    }
};

// Create a data channel spec reference:
// http://dev.w3.org/2011/webrtc/editor/webrtc.html#idl-def-RTCDataChannelInit
PeerConnection.prototype.createDataChannel = function (name, opts) {
    opts || (opts = {});
    var reliable = !!opts.reliable;
    var protocol = opts.protocol || 'text/plain';
    var negotiated = !!(opts.negotiated || opts.preset);
    var settings;
    var channel;
    // firefox is a bit more finnicky
    if (webrtc.prefix === 'moz') {
        if (reliable) {
            settings = {
                protocol: protocol,
                preset: negotiated,
                stream: name
            };
        } else {
            settings = {};
        }
        channel = this.pc.createDataChannel(name, settings);
        channel.binaryType = 'blob';
    } else {
        if (reliable) {
            settings = {
                reliable: true
            };
        } else {
            settings = {reliable: false};
        }
        channel = this.pc.createDataChannel(name, settings);
    }
    return channel;
};

module.exports = PeerConnection;

},{"webrtcsupport":97,"wildemitter":120}],90:[function(require,module,exports){
var support = require('webrtcsupport');


function GainController(stream) {
    this.support = support.webAudio && support.mediaStream;

    // set our starting value
    this.gain = 1;

    if (this.support) {
        var context = this.context = new support.AudioContext();
        this.microphone = context.createMediaStreamSource(stream);
        this.gainFilter = context.createGain();
        this.destination = context.createMediaStreamDestination();
        this.outputStream = this.destination.stream;
        this.microphone.connect(this.gainFilter);
        this.gainFilter.connect(this.destination);
        stream.removeTrack(stream.getAudioTracks()[0]);
        stream.addTrack(this.outputStream.getAudioTracks()[0]);
    }
    this.stream = stream;
}

// setting
GainController.prototype.setGain = function (val) {
    // check for support
    if (!this.support) return;
    this.gainFilter.gain.value = val;
    this.gain = val;
};

GainController.prototype.getGain = function () {
    return this.gain;
};

GainController.prototype.off = function () {
    return this.setGain(0);
};

GainController.prototype.on = function () {
    this.setGain(1);
};


module.exports = GainController;

},{"webrtcsupport":91}],91:[function(require,module,exports){
// created by @HenrikJoreteg
var PC = window.mozRTCPeerConnection || window.webkitRTCPeerConnection || window.RTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
var prefix = function () {
    if (window.mozRTCPeerConnection) {
        return 'moz';
    } else if (window.webkitRTCPeerConnection) {
        return 'webkit';
    }
}();
var MediaStream = window.webkitMediaStream || window.MediaStream;
var screenSharing = navigator.userAgent.match('Chrome') && parseInt(navigator.userAgent.match(/Chrome\/(.*) /)[1], 10) >= 26;
var AudioContext = window.webkitAudioContext || window.AudioContext;

// export support flags and constructors.prototype && PC
module.exports = {
    support: !!PC,
    dataChannel: !!(PC && PC.prototype && PC.prototype.createDataChannel),
    prefix: prefix,
    webAudio: !!(AudioContext && AudioContext.prototype.createMediaStreamSource),
    mediaStream: !!(MediaStream && MediaStream.prototype.removeTrack),
    screenSharing: screenSharing,
    AudioContext: AudioContext,
    PeerConnection: PC,
    SessionDescription: SessionDescription,
    IceCandidate: IceCandidate
};

},{}],92:[function(require,module,exports){
var methods = "assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(",");
var l = methods.length;
var fn = function () {};
var mockconsole = {};

while (l--) {
    mockconsole[methods[l]] = fn;
}

module.exports = mockconsole;

},{}],93:[function(require,module,exports){
var tosdp = require('./lib/tosdp');
var tojson = require('./lib/tojson');


exports.toSessionSDP = tosdp.toSessionSDP;
exports.toMediaSDP = tosdp.toMediaSDP;
exports.toCandidateSDP = tosdp.toCandidateSDP;

exports.toSessionJSON = tojson.toSessionJSON;
exports.toMediaJSON = tojson.toMediaJSON;
exports.toCandidateJSON = tojson.toCandidateJSON;

},{"./lib/tojson":95,"./lib/tosdp":96}],94:[function(require,module,exports){
exports.lines = function (sdp) {
    return sdp.split('\r\n').filter(function (line) {
        return line.length > 0;
    });
};

exports.findLine = function (prefix, mediaLines, sessionLines) {
    var prefixLength = prefix.length;
    for (var i = 0; i < mediaLines.length; i++) {
        if (mediaLines[i].substr(0, prefixLength) === prefix) {
            return mediaLines[i];
        }
    }
    // Continue searching in parent session section
    if (!sessionLines) {
        return false;
    }

    for (var j = 0; j < sessionLines.length; j++) {
        if (sessionLines[j].substr(0, prefixLength) === prefix) {
            return sessionLines[j];
        }
    }

    return false;
};

exports.findLines = function (prefix, mediaLines, sessionLines) {
    var results = [];
    var prefixLength = prefix.length;
    for (var i = 0; i < mediaLines.length; i++) {
        if (mediaLines[i].substr(0, prefixLength) === prefix) {
            results.push(mediaLines[i]);
        }
    }
    if (results.length || !sessionLines) {
        return results;
    }
    for (var j = 0; j < sessionLines.length; j++) {
        if (sessionLines[j].substr(0, prefixLength) === prefix) {
            results.push(sessionLines[j]);
        }
    }
    return results;
};

exports.mline = function (line) {
    var parts = line.substr(2).split(' ');
    var parsed = {
        media: parts[0],
        port: parts[1],
        proto: parts[2],
        formats: []
    };
    for (var i = 3; i < parts.length; i++) {
        if (parts[i]) {
            parsed.formats.push(parts[i]);
        }
    }
    return parsed;
};

exports.rtpmap = function (line) {
    var parts = line.substr(9).split(' ');
    var parsed = {
        id: parts.shift()
    };

    parts = parts[0].split('/');

    parsed.name = parts[0];
    parsed.clockrate = parts[1];
    parsed.channels = parts.length == 3 ? parts[2] : '1';
    return parsed;
};

exports.fmtp = function (line) {
    var kv, key, value;
    var parts = line.substr(line.indexOf(' ') + 1).split(';');
    var parsed = [];
    for (var i = 0; i < parts.length; i++) {
        kv = parts[i].split('=');
        key = kv[0].trim();
        value = kv[1];
        if (key && value) {
            parsed.push({key: key, value: value});
        } else if (key) {
            parsed.push({key: '', value: key});
        }
    }
    return parsed;
};

exports.crypto = function (line) {
    var parts = line.substr(9).split(' ');
    var parsed = {
        tag: parts[0],
        cipherSuite: parts[1],
        keyParams: parts[2],
        sessionParams: parts.slice(3).join(' ')
    };
    return parsed;
};

exports.fingerprint = function (line) {
    var parts = line.substr(14).split(' ');
    return {
        hash: parts[0],
        value: parts[1]
    };
};

exports.extmap = function (line) {
    var parts = line.substr(9).split(' ');
    var parsed = {};

    var idpart = parts.shift();
    var sp = idpart.indexOf('/');
    if (sp >= 0) {
        parsed.id = idpart.substr(0, sp);
        parsed.senders = idpart.substr(sp);
    } else {
        parsed.id = idpart;
        parsed.senders = 'sendrecv';
    }

    parsed.uri = parts.shift();

    return parsed;
};

exports.rtcpfb = function (line) {
    var parts = line.substr(10).split(' ');
    var parsed = {};
    parsed.id = parts.shift();
    parsed.type = parts.shift();
    if (parsed.type === 'trr-int') {
        parsed.value = parts.shift();
    } else {
        parsed.subtype = parts.shift();
    }
    parsed.parameters = parts;
    return parsed;
};

exports.candidate = function (line) {
    var parts = line.substring(12).split(' ');

    var candidate = {
        foundation: parts[0],
        component: parts[1],
        protocol: parts[2].toLowerCase(),
        priority: parts[3],
        ip: parts[4],
        port: parts[5],
        // skip parts[6] == 'typ'
        type: parts[7]
    };

    for (var i = 8; i < parts.length; i += 2) {
        if (parts[i] === 'raddr') {
            candidate.relAddr = parts[i + 1];
        } else if (parts[i] === 'rport') {
            candidate.relPort = parts[i + 1];
        } else if (parts[i] === 'generation') {
            candidate.generation = parts[i + 1];
        }
    }

    candidate.network = '1';

    return candidate;
};

exports.ssrc = function (lines) {
    // http://tools.ietf.org/html/rfc5576
    var parsed = [];
    var perssrc = {};
    var parts;
    var ssrc;
    for (var i = 0; i < lines.length; i++) {
        parts = lines[i].substr(7).split(' ');
        ssrc = parts.shift();
        parts = parts.join(' ').split(':');
        var attribute = parts.shift();
        var value = parts.join(':') || null;
        if (!perssrc[ssrc]) perssrc[ssrc] = {};
        perssrc[ssrc][attribute] = value;
    }
    for (ssrc in perssrc) {
        var item = perssrc[ssrc];
        item.ssrc = ssrc;
        parsed.push(item);
    }
    return parsed;
};

exports.grouping = function (lines) {
    // http://tools.ietf.org/html/rfc5888
    var parsed = [];
    var parts;
    for (var i = 0; i < lines.length; i++) {
        parts = lines[i].substr(8).split(' ');
        parsed.push({
            semantics: parts.shift(),
            contents: parts
        });
    }
    return parsed;
};

},{}],95:[function(require,module,exports){
var parsers = require('./parsers');
var idCounter = Math.random();


exports.toSessionJSON = function (sdp, creator) {
    // Divide the SDP into session and media sections.
    var media = sdp.split('\r\nm=');
    for (var i = 1; i < media.length; i++) {
        media[i] = 'm=' + media[i];
        if (i !== media.length - 1) {
            media[i] += '\r\n';
        }
    }
    var session = media.shift() + '\r\n';
    var sessionLines = parsers.lines(session);
    var parsed = {};

    var contents = [];
    media.forEach(function (m) {
        contents.push(exports.toMediaJSON(m, session, creator));
    });
    parsed.contents = contents;

    var groupLines = parsers.findLines('a=group:', sessionLines);
    if (groupLines.length) {
        parsed.groupings = parsers.grouping(groupLines);
    }

    return parsed;
};

exports.toMediaJSON = function (media, session, creator) {
    var lines = parsers.lines(media);
    var sessionLines = parsers.lines(session);
    var mline = parsers.mline(lines[0]);

    var content = {
        creator: creator,
        name: mline.media,
        description: {
            descType: 'rtp',
            media: mline.media,
            payloads: [],
            encryption: [],
            feedback: [],
            headerExtensions: []
        },
        transport: {
            transType: 'iceUdp',
            candidates: [],
            fingerprints: []
        }
    };
    var desc = content.description;
    var trans = content.transport;

    var ssrc = parsers.findLine('a=ssrc:', lines);
    if (ssrc) {
        desc.ssrc = ssrc.substr(7).split(' ')[0];
    }

    // If we have a mid, use that for the content name instead.
    var mid = parsers.findLine('a=mid:', lines);
    if (mid) {
        content.name = mid.substr(6);
    }

    if (parsers.findLine('a=sendrecv', lines, sessionLines)) {
        content.senders = 'both';
    } else if (parsers.findLine('a=sendonly', lines, sessionLines)) {
        content.senders = 'initiator';
    } else if (parsers.findLine('a=recvonly', lines, sessionLines)) {
        content.senders = 'responder';
    } else if (parsers.findLine('a=inactive', lines, sessionLines)) {
        content.senders = 'none';
    }

    var rtpmapLines = parsers.findLines('a=rtpmap:', lines);
    rtpmapLines.forEach(function (line) {
        var payload = parsers.rtpmap(line);
        payload.feedback = [];

        var fmtpLines = parsers.findLines('a=fmtp:' + payload.id, lines);
        fmtpLines.forEach(function (line) {
            payload.parameters = parsers.fmtp(line);
        });

        var fbLines = parsers.findLines('a=rtcp-fb:' + payload.id, lines);
        fbLines.forEach(function (line) {
            payload.feedback.push(parsers.rtcpfb(line));
        });

        desc.payloads.push(payload);
    });

    var cryptoLines = parsers.findLines('a=crypto:', lines, sessionLines);
    cryptoLines.forEach(function (line) {
        desc.encryption.push(parsers.crypto(line));
    });

    if (parsers.findLine('a=rtcp-mux', lines)) {
        desc.mux = true;
    }

    var fbLines = parsers.findLines('a=rtcp-fb:*', lines);
    fbLines.forEach(function (line) {
        desc.feedback.push(parsers.rtcpfb(line));
    });

    var extLines = parsers.findLines('a=extmap:', lines);
    extLines.forEach(function (line) {
        var ext = parsers.extmap(line);

        var senders = {
            sendonly: 'responder',
            recvonly: 'initiator',
            sendrecv: 'both',
            inactive: 'none'
        };
        ext.senders = senders[ext.senders];

        desc.headerExtensions.push(ext);
    });

    var ssrcLines = parsers.findLines('a=ssrc:', lines);
    if (ssrcLines.length) {
        desc.ssrcs = parsers.ssrc(ssrcLines);
    }

    var fingerprintLines = parsers.findLines('a=fingerprint:', lines, sessionLines);
    fingerprintLines.forEach(function (line) {
        trans.fingerprints.push(parsers.fingerprint(line));
    });

    var ufragLine = parsers.findLine('a=ice-ufrag:', lines, sessionLines);
    var pwdLine = parsers.findLine('a=ice-pwd:', lines, sessionLines);
    if (ufragLine && pwdLine) {
        trans.ufrag = ufragLine.substr(12);
        trans.pwd = pwdLine.substr(10);
        trans.candidates = [];

        var candidateLines = parsers.findLines('a=candidate:', lines, sessionLines);
        candidateLines.forEach(function (line) {
            trans.candidates.push(exports.toCandidateJSON(line));
        });
    }

    return content;
};

exports.toCandidateJSON = function (line) {
    var candidate = parsers.candidate(line.split('\r\n')[0]);
    candidate.id = (idCounter++).toString(36).substr(0, 12);
    return candidate;
};

},{"./parsers":94}],96:[function(require,module,exports){
var senders = {
    'initiator': 'sendonly',
    'responder': 'recvonly',
    'both': 'sendrecv',
    'none': 'inactive',
    'sendonly': 'initator',
    'recvonly': 'responder',
    'sendrecv': 'both',
    'inactive': 'none'
};


exports.toSessionSDP = function (session, sid) {
    var sdp = [
        'v=0',
        'o=- ' + (sid || session.sid || Date.now()) + ' ' + Date.now() + ' IN IP4 0.0.0.0',
        's=-',
        't=0 0'
    ];

    var groupings = session.groupings || [];
    groupings.forEach(function (grouping) {
        sdp.push('a=group:' + grouping.semantics + ' ' + grouping.contents.join(' '));
    });

    var contents = session.contents || [];
    contents.forEach(function (content) {
        sdp.push(exports.toMediaSDP(content));
    });

    return sdp.join('\r\n') + '\r\n';
};

exports.toMediaSDP = function (content) {
    var sdp = [];

    var desc = content.description;
    var transport = content.transport;
    var payloads = desc.payloads || [];
    var fingerprints = (transport && transport.fingerprints) || [];

    var mline = [desc.media, '1'];

    if ((desc.encryption && desc.encryption.length > 0) || (fingerprints.length > 0)) {
        mline.push('RTP/SAVPF');
    } else {
        mline.push('RTP/AVPF');
    }
    payloads.forEach(function (payload) {
        mline.push(payload.id);
    });


    sdp.push('m=' + mline.join(' '));

    sdp.push('c=IN IP4 0.0.0.0');
    sdp.push('a=rtcp:1 IN IP4 0.0.0.0');

    if (transport) {
        if (transport.ufrag) {
            sdp.push('a=ice-ufrag:' + transport.ufrag);
        }
        if (transport.pwd) {
            sdp.push('a=ice-pwd:' + transport.pwd);
        }
        fingerprints.forEach(function (fingerprint) {
            sdp.push('a=fingerprint:' + fingerprint.hash + ' ' + fingerprint.value);
        });
    }

    sdp.push('a=' + (senders[content.senders] || 'sendrecv'));
    sdp.push('a=mid:' + content.name);

    if (desc.mux) {
        sdp.push('a=rtcp-mux');
    }

    var encryption = desc.encryption || [];
    encryption.forEach(function (crypto) {
        sdp.push('a=crypto:' + crypto.tag + ' ' + crypto.cipherSuite + ' ' + crypto.keyParams + (crypto.sessionParams ? ' ' + crypto.sessionParams : ''));
    });

    payloads.forEach(function (payload) {
        var rtpmap = 'a=rtpmap:' + payload.id + ' ' + payload.name + '/' + payload.clockrate;
        if (payload.channels && payload.channels != '1') {
            rtpmap += '/' + payload.channels;
        }
        sdp.push(rtpmap);

        if (payload.parameters && payload.parameters.length) {
            var fmtp = ['a=fmtp:' + payload.id];
            payload.parameters.forEach(function (param) {
                fmtp.push((param.key ? param.key + '=' : '') + param.value);
            });
            sdp.push(fmtp.join(' '));
        }

        if (payload.feedback) {
            payload.feedback.forEach(function (fb) {
                if (fb.type === 'trr-int') {
                    sdp.push('a=rtcp-fb:' + payload.id + ' trr-int ' + fb.value ? fb.value : '0');
                } else {
                    sdp.push('a=rtcp-fb:' + payload.id + ' ' + fb.type + (fb.subtype ? ' ' + fb.subtype : ''));
                }
            });
        }
    });

    if (desc.feedback) {
        desc.feedback.forEach(function (fb) {
            if (fb.type === 'trr-int') {
                sdp.push('a=rtcp-fb:* trr-int ' + fb.value ? fb.value : '0');
            } else {
                sdp.push('a=rtcp-fb:* ' + fb.type + (fb.subtype ? ' ' + fb.subtype : ''));
            }
        });
    }

    var hdrExts = desc.headerExtensions || [];
    hdrExts.forEach(function (hdr) {
        sdp.push('a=extmap:' + hdr.id + (hdr.senders ? '/' + senders[hdr.senders] : '') + ' ' + hdr.uri);
    });

    var ssrcs = desc.ssrcs || [];
    ssrcs.forEach(function (ssrc) {
        for (var attribute in ssrc) {
            if (attribute == 'ssrc') continue;
            sdp.push('a=ssrc:' + (ssrc.ssrc || desc.ssrc) + ' ' + attribute + (ssrc[attribute] ? (':' + ssrc[attribute]) : ''));
        }
    });

    var candidates = transport.candidates || [];
    candidates.forEach(function (candidate) {
        sdp.push(exports.toCandidateSDP(candidate));
    });

    return sdp.join('\r\n');
};

exports.toCandidateSDP = function (candidate) {
    var sdp = [];

    sdp.push(candidate.foundation);
    sdp.push(candidate.component);
    sdp.push(candidate.protocol);
    sdp.push(candidate.priority);
    sdp.push(candidate.ip);
    sdp.push(candidate.port);

    var type = candidate.type;
    sdp.push('typ');
    sdp.push(type);
    if (type === 'srflx' || type === 'prflx' || type === 'relay') {
        if (candidate.relAddr && candidate.relPort) {
            sdp.push('raddr');
            sdp.push(candidate.relAddr);
            sdp.push('rport');
            sdp.push(candidate.relPort);
        }
    }

    sdp.push('generation');
    sdp.push(candidate.generation || '0');

    return 'a=candidate:' + sdp.join(' ');
};

},{}],97:[function(require,module,exports){
// created by @HenrikJoreteg
var prefix;
var isChrome = false;
var isFirefox = false;
var ua = navigator.userAgent.toLowerCase();

// basic sniffing
if (ua.indexOf('firefox') !== -1) {
    prefix = 'moz';
    isFirefox = true;
} else if (ua.indexOf('chrome') !== -1) {
    prefix = 'webkit';
    isChrome = true;
}

var PC = window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
var IceCandidate = window.mozRTCIceCandidate || window.RTCIceCandidate;
var SessionDescription = window.mozRTCSessionDescription || window.RTCSessionDescription;
var MediaStream = window.webkitMediaStream || window.MediaStream;
var screenSharing = navigator.userAgent.match('Chrome') && parseInt(navigator.userAgent.match(/Chrome\/(.*) /)[1], 10) >= 26;
var AudioContext = window.webkitAudioContext || window.AudioContext;


// export support flags and constructors.prototype && PC
module.exports = {
    support: !!PC,
    dataChannel: isChrome || isFirefox || (PC.prototype && PC.prototype.createDataChannel),
    prefix: prefix,
    webAudio: !!(AudioContext && AudioContext.prototype.createMediaStreamSource),
    mediaStream: !!(MediaStream && MediaStream.prototype.removeTrack),
    screenSharing: !!screenSharing,
    AudioContext: AudioContext,
    PeerConnection: PC,
    SessionDescription: SessionDescription,
    IceCandidate: IceCandidate
};

},{}],98:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var core = require('./lib/core');
var helpers = require('./lib/helpers');
var types = require('./lib/types');

module.exports = _.extend({}, core, helpers, types);

},{"./lib/core":99,"./lib/helpers":100,"./lib/types":101,"underscore":119}],99:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var parser = new (require('xmlshim').DOMParser)();
var serializer = new (require('xmlshim').XMLSerializer)();

var helpers = require('./helpers');
var types = require('./types');
var find = helpers.find;

var LOOKUP = {};
var LOOKUP_EXT = {};
var TOP_LEVEL_LOOKUP = {};


function topLevel(JXT) {
    var name = JXT.prototype._NS + '|' + JXT.prototype._EL;
    LOOKUP[name] = JXT;
    TOP_LEVEL_LOOKUP[name] = JXT;
}

function toString(xml) {
    return serializer.serializeToString(xml);
}

function toJSON(jxt) {
    var prop;
    var result = {};
    var exclude = {
        constructor: true,
        _EL: true,
        _NS: true,
        _extensions: true,
        _name: true,
        parent: true,
        prototype: true,
        toJSON: true,
        toString: true,
        xml: true
    };

    for (prop in jxt._extensions) {
        if (jxt._extensions[prop].toJSON && prop[0] !== '_') {
            result[prop] = jxt._extensions[prop].toJSON();
        }
    }

    for (prop in jxt) {
        if (!exclude[prop] && !((LOOKUP_EXT[jxt._NS + '|' + jxt._EL] || {})[prop]) && !jxt._extensions[prop] && prop[0] !== '_') {
            var val = jxt[prop];
            if (typeof val == 'function') continue;
            var type = Object.prototype.toString.call(val);
            if (type.indexOf('Object') >= 0) {
                if (Object.keys(val).length > 0) {
                    result[prop] = val;
                }
            } else if (type.indexOf('Array') >= 0) {
                if (val.length > 0) {
                    result[prop] = val;
                }
            } else if (!!val) {
                result[prop] = val;
            }
        }
    }

    return result;
}


exports.build = function (xml) {
    var JXT = TOP_LEVEL_LOOKUP[xml.namespaceURI + '|' + xml.localName];
    if (JXT) {
        return new JXT(null, xml);
    }
};

exports.extend = function (ParentJXT, ChildJXT, multiName) {
    var parentName = ParentJXT.prototype._NS + '|' + ParentJXT.prototype._EL;
    var name = ChildJXT.prototype._name;
    var qName = ChildJXT.prototype._NS + '|' + ChildJXT.prototype._EL;

    LOOKUP[qName] = ChildJXT;
    if (!LOOKUP_EXT[qName]) {
        LOOKUP_EXT[qName] = {};
    }
    if (!LOOKUP_EXT[parentName]) {
        LOOKUP_EXT[parentName] = {};
    }
    LOOKUP_EXT[parentName][name] = ChildJXT;

    exports.add(ParentJXT, name, types.extension(ChildJXT));
    if (multiName) {
        exports.add(ParentJXT, multiName, types.multiExtension(ChildJXT));
    }
};

exports.add = function (ParentJXT, fieldName, field) {
    field.enumerable = true;
    Object.defineProperty(ParentJXT.prototype, fieldName, field);
};

exports.define = function (opts) {
    var StanzaConstructor = function (data, xml, parent) {
        var self = this;

        var parentNode = (xml || {}).parentNode || (parent || {}).xml;
        var parentNS = (parentNode || {}).namespaceURI;

        self.xml = xml || helpers.createElement(self._NS, self._EL, parentNS);

        self._extensions = {};

        _.each(self.xml.childNodes, function (child) {
            var childName = child.namespaceURI + '|' + child.localName;
            var ChildJXT = LOOKUP[childName];
            if (ChildJXT !== undefined) {
                var name = ChildJXT.prototype._name;
                self._extensions[name] = new ChildJXT(null, child);
                self._extensions[name].parent = self;
            }
        });

        _.extend(self, data);

        if (opts.init) {
            opts.init(data);
        }

        return self;
    };

    StanzaConstructor.prototype = {
        constructor: {
            value: StanzaConstructor
        },
        _name: opts.name,
        _eventname: opts.eventName,
        _NS: opts.namespace,
        _EL: opts.element,
        toString: function () { return toString(this.xml); },
        toJSON: function () { return toJSON(this); }
    };

    var fieldNames = Object.keys(opts.fields || {});
    fieldNames.forEach(function (fieldName) {
        exports.add(StanzaConstructor, fieldName, opts.fields[fieldName]);
    });

    if (opts.topLevel) {
        topLevel(StanzaConstructor);
    }

    return StanzaConstructor;
};

},{"./helpers":100,"./types":101,"underscore":119,"xmlshim":104}],100:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var dom = require('xmlshim');

var XML_NS = exports.XML_NS = 'http://www.w3.org/XML/1998/namespace';

var serializer = new dom.XMLSerializer();
var parser = new dom.DOMParser();
var doc = dom.implementation.createDocument('', '', null);

exports.parse = function (JXT, str) {
    var nodes = parser.parseFromString(str, 'application/xml').childNodes;
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeType === 1) {
            return new JXT({}, nodes[i]);
        }
    }

    throw new Error('Could not parse: ' + str);
};

exports.getParser = function () {
    return parser;
};

exports.getSerializer = function () {
    return serializer;
};

exports.createElement = function (NS, name, parentNS) {
    var el = doc.createElementNS(NS, name);
    if (!parentNS || parentNS !== NS) {
        exports.setAttribute(el, 'xmlns', NS);
    }
    return el;
};

var find = exports.find = function (xml, NS, selector) {
    var children = xml.getElementsByTagName(selector);
    return _.filter(children, function (child) {
        return child.namespaceURI === NS && child.parentNode == xml;
    });
};

exports.findOrCreate = function (xml, NS, selector) {
    var existing = exports.find(xml, NS, selector);
    if (existing.length) {
        return existing[0];
    } else {
        var created = exports.createElement(NS, selector, xml.namespaceURI);
        xml.appendChild(created);
        return created;
    }
};

exports.getAttribute = function (xml, attr, defaultVal) {
    return xml.getAttribute(attr) || defaultVal || '';
};

exports.setAttribute = function (xml, attr, value, force) {
    if (value || force) {
        xml.setAttribute(attr, value);
    } else {
        xml.removeAttribute(attr);
    }
};

exports.getBoolAttribute = function (xml, attr, defaultVal) {
    var val = xml.getAttribute(attr) || defaultVal || '';
    return val === 'true' || val === '1';
};

exports.setBoolAttribute = function (xml, attr, value) {
    if (value) {
        xml.setAttribute(attr, '1');
    } else {
        xml.removeAttribute(attr);
    }
};

exports.getSubAttribute = function (xml, NS, sub, attr, defaultVal) {
    var subs = find(xml, NS, sub);
    if (!subs) {
        return '';
    }

    for (var i = 0; i < subs.length; i++) {
        return subs[i].getAttribute(attr) || defaultVal || '';
    }

    return '';
};

exports.setSubAttribute = function (xml, NS, sub, attr, value) {
    var subs = find(xml, NS, sub);
    if (!subs.length) {
        if (value) {
            sub = exports.createElement(NS, sub, xml.namespaceURI);
            sub.setAttribute(attr, value);
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (value) {
                subs[i].setAttribute(attr, value);
                return;
            } else {
                subs[i].removeAttribute(attr);
            }
        }
    }
};

exports.getBoolSubAttribute = function (xml, NS, sub, attr, defaultVal) {
    var val = xml.getSubAttribute(NS, sub, attr) || defaultVal || '';
    return val === 'true' || val === '1';
};

exports.setBoolSubAttribute = function (xml, NS, sub, attr, value) {
    value = value ? '1' : '';
    exports.setSubAttribute(xml, NS, sub, attr, value);
};

exports.getText = function (xml) {
    return xml.textContent;
};

exports.setText = function (xml, value) {
    xml.textContent = value;
};

exports.getSubText = function (xml, NS, element, defaultVal) {
    var subs = find(xml, NS, element);

    defaultVal = defaultVal || '';

    if (!subs.length) {
        return defaultVal;
    }

    return subs[0].textContent || defaultVal;
};

exports.setSubText = function (xml, NS, element, value) {
    var subs = find(xml, NS, element);
    if (!subs.length) {
        if (value) {
            var sub = exports.createElement(NS, element, xml.namespaceURI);
            sub.textContent = value;
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (value) {
                subs[i].textContent = value;
                return;
            } else {
                xml.removeChild(subs[i]);
            }
        }
    }
};

exports.getMultiSubText = function (xml, NS, element, extractor) {
    var subs = find(xml, NS, element);
    var results = [];

    extractor = extractor || function (sub) {
        return sub.textContent || '';
    };

    for (var i = 0; i < subs.length; i++) {
        results.push(extractor(subs[i]));
    }

    return results;
};

exports.setMultiSubText = function (xml, NS, element, value, builder) {
    var subs = find(xml, NS, element);
    var values = [];
    builder = builder || function (value) {
        var sub = exports.createElement(NS, element, xml.namespaceURI);
        sub.textContent = value;
        xml.appendChild(sub);
    };
    if (typeof value === 'string') {
        values = (value || '').split('\n');
    } else {
        values = value;
    }
    _.forEach(subs, function (sub) {
        xml.removeChild(sub);
    });
    _.forEach(values, function (val) {
        if (val) {
            builder(val);
        }
    });
};

exports.getSubLangText = function (xml, NS, element, defaultLang) {
    var subs = find(xml, NS, element);
    if (!subs.length) {
        return {};
    }

    var lang, sub;
    var results = {};
    var langs = [];

    for (var i = 0; i < subs.length; i++) {
        sub = subs[i];
        lang = sub.getAttributeNS(XML_NS, 'lang') || defaultLang;
        langs.push(lang);
        results[lang] = sub.textContent || '';
    }

    return results;
};

exports.setSubLangText = function (xml, NS, element, value, defaultLang) {
    var sub, lang;
    var subs = find(xml, NS, element);
    if (subs.length) {
        for (var i = 0; i < subs.length; i++) {
            xml.removeChild(subs[i]);
        }
    }

    if (typeof value === 'string') {
        sub = exports.createElement(NS, element, xml.namespaceURI);
        sub.textContent = value;
        xml.appendChild(sub);
    } else if (typeof value === 'object') {
        for (lang in value) {
            if (value.hasOwnProperty(lang)) {
                sub = exports.createElement(NS, element, xml.namespaceURI);
                if (lang !== defaultLang) {
                    sub.setAttributeNS(XML_NS, 'lang', lang);
                }
                sub.textContent = value[lang];
                xml.appendChild(sub);
            }
        }
    }
};

exports.getBoolSub = function (xml, NS, element) {
    var subs = find(xml, NS, element);
    return !!subs.length;
};

exports.setBoolSub = function (xml, NS, element, value) {
    var subs = find(xml, NS, element);
    if (!subs.length) {
        if (value) {
            var sub = exports.createElement(NS, element, xml.namespaceURI);
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (value) {
                return;
            } else {
                xml.removeChild(subs[i]);
            }
        }
    }
};

},{"underscore":119,"xmlshim":104}],101:[function(require,module,exports){
"use strict";

var _ = require('underscore');
var fromB64 = require('atob');
var toB64 = require('btoa');

var helpers = require('./helpers');
var find = helpers.find;


var field = exports.field = function (getter, setter) {
    return function () {
        var args = _.toArray(arguments);
        return {
            get: function () {
                return getter.apply(null, [this.xml].concat(args));
            },
            set: function (value) {
                setter.apply(null, ([this.xml].concat(args)).concat([value]));
            }
        };
    };
};

exports.field = field;
exports.boolAttribute = field(helpers.getBoolAttribute,
                              helpers.setBoolAttribute);
exports.subAttribute = field(helpers.getSubAttribute,
                             helpers.setSubAttribute);
exports.boolSubAttribute = field(helpers.getSubBoolAttribute,
                                 helpers.setSubBoolAttribute);
exports.text = field(helpers.getText,
                     helpers.setText);
exports.subText = field(helpers.getSubText,
                        helpers.setSubText);
exports.multiSubText = field(helpers.getMultiSubText,
                             helpers.setMultiSubText);
exports.subLangText = field(helpers.getSubLangText,
                            helpers.setSubLangText);
exports.boolSub = field(helpers.getBoolSub,
                        helpers.setBoolSub);

exports.langAttribute = field(
    function (xml) {
        return xml.getAttributeNS(helpers.XML_NS, 'lang') || '';
    },
    function (xml, value) {
        xml.setAttributeNS(helpers.XML_NS, 'lang', value);
    }
);

exports.b64Text = field(
    function (xml) {
        if (xml.textContent && xml.textContent != '=') {
            return fromB64(xml.textContent);
        }
        return '';
    },
    function (xml, value) {
        xml.textContent = toB64(value) || '=';
    }
);

exports.dateAttribute = function (attr, now) {
    return {
        get: function () {
            var data = helpers.getAttribute(this.xml, attr);
            if (data) return new Date(data);
            if (now) return new Date(Date.now());
        },
        set: function (value) {
            if (!value) return;
            if (typeof value != 'string') {
                value = value.toISOString();
            }
            helpers.setAttribute(this.xml, attr, value);
        }
    };
};

exports.dateSub = function (NS, sub, now) {
    return {
        get: function () {
            var data = helpers.getSubText(this.xml, NS, sub);
            if (data) return new Date(data);
            if (now) return new Date(Date.now());
        },
        set: function (value) {
            if (!value) return;
            if (typeof value != 'string') {
                value = value.toISOString();
            }
            helpers.setSubText(this.xml, NS, sub, value);
        }
    };
};

exports.dateSubAttribute = function (NS, sub, attr, now) {
    return {
        get: function () {
            var data = helpers.getSubAttribute(this.xml, NS, sub, attr);
            if (data) return new Date(data);
            if (now) return new Date(Date.now());
        },
        set: function (value) {
            if (!value) return;
            if (typeof value != 'string') {
                value = value.toISOString();
            }
            helpers.setSubAttribute(this.xml, NS, sub, attr, value);
        }
    };
};

exports.numberAttribute = field(
    function (xml, attr)  {
        return parseInt(helpers.getAttribute(xml, attr, '0'), 10);
    },
    function (xml, attr, value) {
        helpers.setAttribute(xml, attr, value.toString());
    }
);

exports.numberSub = field(
    function (xml, NS, sub) {
        return parseInt(helpers.getSubText(xml, NS, sub, '0'), 10);
    },
    function (xml, NS, sub, value) {
        helpers.setSubText(xml, NS, sub, value.toString());
    }
);

exports.attribute = function (name, defaultVal) {
    return {
        get: function () {
            return helpers.getAttribute(this.xml, name, defaultVal);
        },
        set: function (value) {
            helpers.setAttribute(this.xml, name, value);
        }
    };
};

exports.extension = function (ChildJXT) {
    return {
        get: function () {
            var self = this;
            var name = ChildJXT.prototype._name;
            if (!this._extensions[name]) {
                var existing = find(this.xml, ChildJXT.prototype._NS, ChildJXT.prototype._EL);
                if (!existing.length) {
                    this._extensions[name] = new ChildJXT({}, null, self);
                    this.xml.appendChild(this._extensions[name].xml);
                } else {
                    this._extensions[name] = new ChildJXT(null, existing[0], self);
                }
                this._extensions[name].parent = this;
            }
            return this._extensions[name];
        },
        set: function (value) {
            var child = this[ChildJXT.prototype._name];
            _.extend(child, value);
        }
    };
};

exports.multiExtension = function (ChildJXT) {
    return {
        get: function () {
            var self = this;
            var data = find(this.xml, ChildJXT.prototype._NS, ChildJXT.prototype._EL);
            var results = [];

            _.forEach(data, function (xml) {
                results.push(new ChildJXT({}, xml, self).toJSON());
            });
            return results;
        },
        set: function (value) {
            var self = this;
            var existing = find(this.xml, ChildJXT.prototype._NS, ChildJXT.prototype._EL);

            _.forEach(existing, function (item) {
                self.xml.removeChild(item);
            });

            _.forEach(value, function (data) {
                var content = new ChildJXT(data, null, self);
                self.xml.appendChild(content.xml);
            });
        }
    };
};

},{"./helpers":100,"atob":102,"btoa":103,"underscore":119}],102:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;(function () {
  "use strict";

  function atob(str) {
    return new Buffer(str, 'base64').toString('binary');
  }

  module.exports = atob;
}());

},{"__browserify_Buffer":70}],103:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;(function () {
  "use strict";

  function btoa(str) {
    var buffer
      ;

    if (str instanceof Buffer) {
      buffer = str;
    } else {
      buffer = new Buffer(str.toString(), 'binary');
    }

    return buffer.toString('base64');
  }

  module.exports = btoa;
}());

},{"__browserify_Buffer":70}],104:[function(require,module,exports){
exports.XMLSerializer = XMLSerializer;
exports.DOMParser = DOMParser;
exports.implementation = document.implementation;

},{}],105:[function(require,module,exports){
var Buffer=require("__browserify_Buffer").Buffer;//     uuid.js
//
//     (c) 2010-2012 Robert Kieffer
//     MIT License
//     https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  // Unique ID creation requires a high quality random # generator.  We feature
  // detect to determine the best RNG source, normalizing to a function that
  // returns 128-bits of randomness, since that's what's usually required
  var _rng;

  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
  //
  // Moderately fast, high quality
  if (typeof(require) == 'function') {
    try {
      var _rb = require('crypto').randomBytes;
      _rng = _rb && function() {return _rb(16);};
    } catch(e) {}
  }

  if (!_rng && _global.crypto && crypto.getRandomValues) {
    // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
    //
    // Moderately fast, high quality
    var _rnds8 = new Uint8Array(16);
    _rng = function whatwgRNG() {
      crypto.getRandomValues(_rnds8);
      return _rnds8;
    };
  }

  if (!_rng) {
    // Math.random()-based (RNG)
    //
    // If all else fails, use Math.random().  It's fast, but is of unspecified
    // quality.
    var  _rnds = new Array(16);
    _rng = function() {
      for (var i = 0, r; i < 16; i++) {
        if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
        _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
      }

      return _rnds;
    };
  }

  // Buffer class to use
  var BufferClass = typeof(Buffer) == 'function' ? Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // **`parse()` - Parse a UUID into it's component bytes**
  function parse(s, buf, offset) {
    var i = (buf && offset) || 0, ii = 0;

    buf = buf || [];
    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
      if (ii < 16) { // Don't overflow!
        buf[i + ii++] = _hexToByte[oct];
      }
    });

    // Zero out remaining bytes if string was short
    while (ii < 16) {
      buf[i + ii++] = 0;
    }

    return buf;
  }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
  }

  // **`v1()` - Generate time-based UUID**
  //
  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html

  // random #'s we need to init node and clockseq
  var _seedBytes = _rng();

  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  var _nodeId = [
    _seedBytes[0] | 0x01,
    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  ];

  // Per 4.2.2, randomize (14 bit) clockseq
  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // Previous uuid creation time
  var _lastMSecs = 0, _lastNSecs = 0;

  // See https://github.com/broofa/node-uuid for API details
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];

    options = options || {};

    var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;
    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    return buf ? buf : unparse(b);
  }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) == 'string') {
      buf = options == 'binary' ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  uuid.v1 = v1;
  uuid.v4 = v4;
  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;

  if (_global.define && define.amd) {
    // Publish as AMD module
    define(function() {return uuid;});
  } else if (typeof(module) != 'undefined' && module.exports) {
    // Publish as node.js module
    module.exports = uuid;
  } else {
    // Publish as global (in browsers)
    var _previousRoot = _global.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    uuid.noConflict = function() {
      _global.uuid = _previousRoot;
      return uuid;
    };

    _global.uuid = uuid;
  }
}());

},{"__browserify_Buffer":70,"crypto":72}],106:[function(require,module,exports){
/**
* Written by Nathan Fritz. Copyright © 2011 by &yet, LLC. Released under the
* terms of the MIT License:
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*/ 

var EventEmitter = require("events").EventEmitter;

/**
 * You're up a creek; here's your Paddle. In Javascript, we rely on callback
 * execution, often times without knowing for sure that it will happen. With
 * Paddle, you can know. Paddle is a simple way of noting that your code should
 * reach one of several code-execution points within a timelimit. If the time-
 * limit is exceeded, an error callback is executed.
 *
 * @param freq: number of seconds between timeout checks
 */
function Paddle(freq) {
    EventEmitter.call(this);
    this.registry = new Object();
    this.insureids = 0;
    if(freq === undefined) {
        this.freq = 5;
    } else {
        this.freq = freq;
    }
    this.run = false;
    this.start();
}

//extend Paddle with EventEmitter
Paddle.super_ = EventEmitter;
Paddle.prototype = Object.create(EventEmitter.prototype, {
    constructor: {
        value: Paddle,
        enumerable: false
    }
});

/*
 * Register a new check. If the check times out, error_callback will be called
 * with the optionally specified args. You may specify an id, but one will be
 * created otherwise.
 *
 * @param error_callback: function called when timeout is reached without check-in
 * @param timeout: seconds to wait for check-in
 * @param args: Array of arguments to call error_callback with
 * @param id: optional -- insure will generate one for you
 *
 * @return Object: returns the insurance obj you just created
 * {paddle, error_callback, args, id, timeout, done, check_in}
 *
 */
function insure(error_callback, timeout, args, id) {
    if(id === undefined) {
        ++this.insureids;
        this.insureids %= 65000;
        id = this.insureids;
    }
    expiretime = Date.now() + timeout * 1000;
    var that = this;
    var insurance = {
        paddle: that,
        error_callback: error_callback,
        args: args,
        id: id,
        timeout: expiretime,
        done: false,
        check_in: function() {
            return this.paddle.check_in(this.id);
        }
    }
    //this.registry[id] = [expiretime, error_callback, args];
    this.registry[id] = insurance;
    return insurance;
}

/*
 * Check in with an id or paddle to confirm that your end-execution point occurred. This
 * will cancel the timeout error, and delete the entry for this id.
 *
 * @param id or insurance: id from insure or insure obj
 */
function check_in(id) {
    if(id.id !== undefined) {
        //perhaps this is an insure object
        id = id.id;
    }
    if(id in this.registry) {
        this.emit('check_in', this.registry[id]);
        this.registry[id].done = true;
        delete this.registry[id];
        return true;
    }
    return false;
}

/*
 * Executed internally to occasionally make sure all insurance ids are within
 * their timeouts.
 */
function checkEnsures() {
    var now = Date.now();
    for(var id in this.registry) {
        if(now > this.registry[id].timeout) {
            this.registry[id].error_callback.apply(this, this.registry[id].args);
            this.emit('timeout', this.registry[id]);
            delete this.registry[id];
        }
    }
    if(this.run) {
        setTimeout(function() { this.checkEnsures() }.bind(this), this.freq * 1000);
    }
}

/*
 * Start checking paddle timeouts. Optionally reset frequency.
 *
 * @return bool: true if running, false if it was already running.
 */
function start(freq) {
    if(freq !== undefined) {
        this.freq = freq;
    }
    if(!this.run) {
        this.run = true;
        setTimeout(function() { this.checkEnsures() }.bind(this), this.freq * 1000);
        return true;
    } else {
        return false;
    }
}

/*
 * Stop checking Paddle timeouts.
 * @return bool: true if stopped, false if it was already stopped.
 */
function stop() {
    if(this.run) {
        this.run = false;
        return true;
    } else {
        return true;
    }
}

Paddle.prototype.insure = insure;
Paddle.prototype.check_in = check_in;
Paddle.prototype.checkEnsures = checkEnsures;
Paddle.prototype.start = start;
Paddle.prototype.stop = stop;

exports.Paddle = Paddle;

},{"events":65}],107:[function(require,module,exports){
(function(root, factory) {
  if (typeof exports === 'object') {
    // CommonJS
    factory(exports, module);
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports', 'module'], factory);
  }
}(this, function(exports, module) {

  /**
   * ANONYMOUS `Mechanism` constructor.
   *
   * This class implements the ANONYMOUS SASL mechanism.
   *
   * The ANONYMOUS SASL mechanism provides support for permitting anonymous
   * access to various services
   *
   * References:
   *  - [RFC 4505](http://tools.ietf.org/html/rfc4505)
   *
   * @api public
   */
  function Mechanism() {
  }
  
  Mechanism.prototype.name = 'ANONYMOUS';
  Mechanism.prototype.clientFirst = true;
  
  /**
   * Encode a response using optional trace information.
   *
   * Options:
   *  - `trace`  trace information (optional)
   *
   * @param {Object} cred
   * @api public
   */
  Mechanism.prototype.response = function(cred) {
    return cred.trace || '';
  };
  
  /**
   * Decode a challenge issued by the server.
   *
   * @param {String} chal
   * @api public
   */
  Mechanism.prototype.challenge = function(chal) {
  };

  exports = module.exports = Mechanism;
  
}));

},{}],108:[function(require,module,exports){
(function(root, factory) {
  if (typeof exports === 'object') {
    // CommonJS
    factory(exports,
            module,
            require('./lib/mechanism'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports',
            'module',
            './lib/mechanism'], factory);
  }
}(this, function(exports, module, Mechanism) {

  exports = module.exports = Mechanism;
  exports.Mechanism = Mechanism;
  
}));

},{"./lib/mechanism":107}],109:[function(require,module,exports){
(function(root, factory) {
  if (typeof exports === 'object') {
    // CommonJS
    factory(exports, module, require('crypto'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports', 'module', 'crypto'], factory);
  }
}(this, function(exports, module, crypto) {
  
  /**
   * DIGEST-MD5 `Mechanism` constructor.
   *
   * This class implements the DIGEST-MD5 SASL mechanism.
   *
   * References:
   *  - [RFC 2831](http://tools.ietf.org/html/rfc2831)
   *
   * @api public
   */
  function Mechanism(options) {
    options = options || {};
    this._genNonce = options.genNonce || genNonce(32);
  }
  
  Mechanism.prototype.name = 'DIGEST-MD5';
  Mechanism.prototype.clientFirst = false;
  
  /**
   * Encode a response using given credential.
   *
   * Options:
   *  - `username`
   *  - `password`
   *  - `host`
   *  - `serviceType`
   *  - `authzid`   authorization identity (optional)
   *
   * @param {Object} cred
   * @api public
   */
  Mechanism.prototype.response = function(cred) {
    // TODO: Implement support for subsequent authentication.  This requires
    //       that the client be able to store username, realm, nonce,
    //       nonce-count, cnonce, and qop values from prior authentication.
    //       The impact of this requirement needs to be investigated.
    //
    //       See RFC 2831 (Section 2.2) for further details.
    
    // TODO: Implement support for auth-int and auth-conf, as defined in RFC
    //       2831 sections 2.3 Integrity Protection and 2.4 Confidentiality
    //       Protection, respectively.
    //
    //       Note that supporting this functionality has implications
    //       regarding the negotiation of security layers via SASL.  Due to
    //       the fact that TLS has largely superseded this functionality,
    //       implementing it is a low priority.
  
    var uri = cred.serviceType + '/' + cred.host;
    if (cred.serviceName && cred.host !== cred.serviceName) {
      uri += '/' + serviceName;
    }
    var realm = cred.realm || this._realm || ''
      , cnonce = this._genNonce()
      , nc = '00000001'
      , qop = 'auth'
      , ha1
      , ha2
      , digest;
  
    var str = '';
    str += 'username="' + cred.username + '"';
    if (realm) { str += ',realm="' + realm + '"'; };
    str += ',nonce="' + this._nonce + '"';
    str += ',cnonce="' + cnonce + '"';
    str += ',nc=' + nc;
    str += ',qop=' + qop;
    str += ',digest-uri="' + uri + '"';
    
    if (cred.authzid) {
      ha1 = md5(md5(cred.username + ":" + realm + ":" + cred.password, 'binary') + ":" + this._nonce + ":" + cnonce + ":" + cred.authzid);
    } else {
      ha1 = md5(md5(cred.username + ":" + realm + ":" + cred.password, 'binary') + ":" + this._nonce + ":" + cnonce);
    }
    
    if (qop == 'auth') {
      ha2 = md5('AUTHENTICATE:' + uri);
    } else if (qop == 'auth-int' || qop == 'auth-conf') {
      ha2 = md5('AUTHENTICATE:' + uri + ':00000000000000000000000000000000');
    }
    
    digest = md5(ha1 + ":" + this._nonce + ":" + nc + ":" + cnonce + ":" + qop + ":" + ha2);
    str += ',response=' + digest;
    
    if (this._charset == 'utf-8') { str += ',charset=utf-8'; }
    if (cred.authzid) { str += 'authzid="' + cred.authzid + '"'; }
    
    return str;
  };
  
  /**
   * Decode a challenge issued by the server.
   *
   * @param {String} chal
   * @return {Mechanism} for chaining
   * @api public
   */
  Mechanism.prototype.challenge = function(chal) {
    var dtives = parse(chal);
    
    // TODO: Implement support for multiple realm directives, as allowed by the
    //       DIGEST-MD5 specification.
    this._realm = dtives['realm'];
    this._nonce = dtives['nonce'];
    this._qop = (dtives['qop'] || 'auth').split(',');
    this._stale = dtives['stale'];
    this._maxbuf = parseInt(dtives['maxbuf']) || 65536;
    this._charset = dtives['charset'];
    this._algo = dtives['algorithm'];
    this._cipher = dtives['cipher'];
    if (this._cipher) { this._cipher.split(','); }
    return this;
  };
  
  
  /**
   * Parse challenge.
   *
   * @api private
   */
  function parse(chal) {
    var dtives = {};
    var tokens = chal.split(/,(?=(?:[^"]|"[^"]*")*$)/);
    for (var i = 0, len = tokens.length; i < len; i++) {
      var dtiv = /(\w+)=["]?([^"]+)["]?$/.exec(tokens[i]);
      if (dtiv) {
        dtives[dtiv[1]] = dtiv[2];
      }
    }
    return dtives;
  }
  
  /**
   * Return a unique nonce with the given `len`.
   *
   *     genNonce(10)();
   *     // => "FDaS435D2z"
   *
   * @param {Number} len
   * @return {Function}
   * @api private
   */
  function genNonce(len) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      , charlen = chars.length;
  
    return function() {
      var buf = [];
      for (var i = 0; i < len; ++i) {
        buf.push(chars[Math.random() * charlen | 0]);
      }
      return buf.join('');
    }
  }
  
  /**
   * Return md5 hash of the given string and optional encoding,
   * defaulting to hex.
   *
   *     md5('wahoo');
   *     // => "e493298061761236c96b02ea6aa8a2ad"
   *
   * @param {String} str
   * @param {String} encoding
   * @return {String}
   * @api private
   */
  function md5(str, encoding){
    return crypto
      .createHash('md5')
      .update(str)
      .digest(encoding || 'hex');
  }


  exports = module.exports = Mechanism;
  
}));

},{"crypto":72}],110:[function(require,module,exports){
arguments[4][108][0].apply(exports,arguments)
},{"./lib/mechanism":109}],111:[function(require,module,exports){
(function(root, factory) {
  if (typeof exports === 'object') {
    // CommonJS
    factory(exports, module);
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports', 'module'], factory);
  }
}(this, function(exports, module) {

  /**
   * EXTERNAL `Mechanism` constructor.
   *
   * This class implements the EXTERNAL SASL mechanism.
   *
   * The EXTERNAL SASL mechanism provides support for authentication using
   * credentials established by external means. 
   *
   * References:
   *  - [RFC 4422](http://tools.ietf.org/html/rfc4422)
   *
   * @api public
   */
  function Mechanism() {
  }
  
  Mechanism.prototype.name = 'EXTERNAL';
  Mechanism.prototype.clientFirst = true;
  
  /**
   * Encode a response using given credential.
   *
   * Options:
   *  - `authzid`   authorization identity (optional)
   *
   * @param {Object} cred
   * @api public
   */
  Mechanism.prototype.response = function(cred) {
    return cred.authzid || '';
  };
  
  /**
   * Decode a challenge issued by the server.
   *
   * @param {String} chal
   * @api public
   */
  Mechanism.prototype.challenge = function(chal) {
  };

  exports = module.exports = Mechanism;
  
}));

},{}],112:[function(require,module,exports){
arguments[4][108][0].apply(exports,arguments)
},{"./lib/mechanism":111}],113:[function(require,module,exports){
(function(root, factory) {
  if (typeof exports === 'object') {
    // CommonJS
    factory(exports, module);
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports', 'module'], factory);
  }
}(this, function(exports, module) {

  /**
   * PLAIN `Mechanism` constructor.
   *
   * This class implements the PLAIN SASL mechanism.
   *
   * The PLAIN SASL mechanism provides support for exchanging a clear-text
   * username and password.  This mechanism should not be used without adequate
   * security provided by an underlying transport layer. 
   *
   * References:
   *  - [RFC 4616](http://tools.ietf.org/html/rfc4616)
   *
   * @api public
   */
  function Mechanism() {
  }
  
  Mechanism.prototype.name = 'PLAIN';
  Mechanism.prototype.clientFirst = true;
  
  /**
   * Encode a response using given credential.
   *
   * Options:
   *  - `username`
   *  - `password`
   *  - `authzid`   authorization identity (optional)
   *
   * @param {Object} cred
   * @api public
   */
  Mechanism.prototype.response = function(cred) {
    var str = '';
    str += cred.authzid || '';
    str += '\0';
    str += cred.username;
    str += '\0';
    str += cred.password;
    return str;
  };
  
  /**
   * Decode a challenge issued by the server.
   *
   * @param {String} chal
   * @return {Mechanism} for chaining
   * @api public
   */
  Mechanism.prototype.challenge = function(chal) {
    return this;
  };

  exports = module.exports = Mechanism;
  
}));

},{}],114:[function(require,module,exports){
arguments[4][108][0].apply(exports,arguments)
},{"./lib/mechanism":113}],115:[function(require,module,exports){
(function(root, factory) {
  if (typeof exports === 'object') {
    // CommonJS
    factory(exports, module, require('crypto'), require('buffer'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports', 'module', 'crypto', 'buffer'], factory);
  }
}(this, function(exports, module, crypto, buffer) {

    var Buffer = buffer.Buffer;
 
    /**
     * SCRAM-SHA-1 `Mechanism` constructor.
     *
     * This class implements the SCRAM-SHA-1 SASL mechanism.
     *
     * References:
     *  - [RFC 5802](http://tools.ietf.org/html/rfc5802)
     *
     * @api public
     */
    function Mechanism(options) {
        options = options || {};
        this._genNonce = options.genNonce || genNonce(32);
        this._stage = 0;
    }

    Mechanism.prototype.name = 'SCRAM-SHA-1';
    Mechanism.prototype.clientFirst = true;

    /**
     * Encode a response using given credentials.
     *
     * Options:
     *  - `username`
     *  - `password`
     *  - `authzid`
     *
     * @param {object} cred
     * @api public
     */
    Mechanism.prototype.response = function (cred) {
        return responses[this._stage](this, cred); 
    };

    /**
     * Decode a challenge issued by the server.
     *
     * @param {String} chal
     * @return {Mechanism} for chaining
     * @api public
     */
    Mechanism.prototype.challenge = function (chal) {
        var values = parse(chal);

        this._salt = new Buffer(values.s || '', 'base64').toString('binary');
        this._iterationCount = parseInt(values.i, 10);
        this._nonce = values.r;
        this._verifier = values.v;
        this._error = values.e;
        this._challenge = chal;

        return this;
    };


    var responses = {};
    responses[0] = function (mech, cred) {
        mech._cnonce = mech._genNonce();

        var authzid = '';
        if (cred.authzid) {
            authzid = 'a=' + saslname(cred.authzid);
        }

        mech._gs2Header = 'n,' + authzid + ',';

        var nonce = 'r=' + mech._cnonce;
        var username = 'n=' + saslname(cred.username);

        mech._clientFirstMessageBare = username + ',' + nonce;
        var result = mech._gs2Header + mech._clientFirstMessageBare

        mech._stage = 1;

        return result;
    };
    responses[1] = function (mech, cred) {
        var gs2Header = new Buffer(mech._gs2Header).toString('base64');

        mech._clientFinalMessageWithoutProof = 'c=' + gs2Header + ',r=' + mech._nonce;

        var saltedPassword, clientKey, serverKey;
        if (cred.clientKey && cred.serverKey) {
            clientKey = cred.clientKey;
            serverKey = cred.serverKey;
        } else {
            saltedPassword = cred.saltedPassword || Hi(cred.password, mech._salt, mech._iterationCount);
            clientKey = HMAC(saltedPassword, 'Client Key');
            serverKey = HMAC(saltedPassword, 'Server Key');
        }

        var storedKey = H(clientKey);
        var authMessage = mech._clientFirstMessageBare + ',' +
                          mech._challenge + ',' + 
                          mech._clientFinalMessageWithoutProof;
        var clientSignature = HMAC(storedKey, authMessage);

        var xorstuff = XOR(clientKey, clientSignature);

        var clientProof = new Buffer(xorstuff, 'binary').toString('base64');

        mech._serverSignature = HMAC(serverKey, authMessage);

        var result = mech._clientFinalMessageWithoutProof + ',p=' + clientProof;

        mech._stage = 2;

        mech.cache = {
            saltedPassword: saltedPassword,
            clientKey: clientKey,
            serverKey: serverKey
        };

        return result;
    };
    responses[2] = function (mech, cred) {
        // TODO: Signal errors 
        return '';
    };

    /**
     * Create a SHA-1 HMAC.
     *
     * @param {String} key
     * @param {String} msg
     * @api private
     */
    function HMAC(key, msg) {
        return crypto.createHmac('sha1', key).update(msg).digest('binary');
    }

    /**
     * Iteratively create an HMAC, with a salt.
     *
     * @param {String} text
     * @param {String} salt
     * @param {Number} iterations
     * @api private
     */
    function Hi(text, salt, iterations) {
        var ui1 = HMAC(text, salt + '\0\0\0\1');
        var ui = ui1;
        for (var i = 0; i < iterations - 1; i++) {
            ui1 = HMAC(text, ui1);
            ui = XOR(ui, ui1);
        }
        return ui;
    }

    /**
     * Create a SHA-1 hash.
     *
     * @param {String} text
     * @api private
     */
    function H(text) {
        return crypto.createHash('sha1').update(text).digest('binary');
    }

    /**
     * String XOR
     *
     * @param {String} a
     * @param {String} b
     * @api private
     */
    function XOR(a, b) {
        a = new Buffer(a, 'binary');
        b = new Buffer(b, 'binary');

        var len = Math.min(a.length, b.length);
        result = [];
        for (var i = 0; i < len; i++) {
            result.push(a[i] ^ b[i]);
        }
        result = new Buffer(result, 'binary');
        return result.toString('binary');
    }

    /**
     * Escape special characters in username values.
     *
     * @param {String} name
     * @api private
     */
    function saslname(name) {
        var escaped = [];
        var curr = '';
        for (var i = 0; i < name.length; i++) {
            curr = name[i];
            if (curr === ',') {
                escaped.push('=2C');
            } else if (curr === '=') {
                escaped.push('=3D');
            } else {
                escaped.push(curr);
            }
        }
        return escaped.join('');
    }

    /**
     * Parse challenge.
     *
     * @api private
     */
    function parse(chal) {
        var dtives = {};
        var tokens = chal.split(/,(?=(?:[^"]|"[^"]*")*$)/);
        for (var i = 0, len = tokens.length; i < len; i++) {
            var dtiv = /(\w+)=["]?([^"]+)["]?$/.exec(tokens[i]);
            if (dtiv) {
                dtives[dtiv[1]] = dtiv[2];
            }
        }
        return dtives;
    }
  
 
    /**
    * Return a unique nonce with the given `len`.
    *
    *     genNonce(10)();
    *     // => "FDaS435D2z"
    *
    * @param {Number} len
    * @return {Function}
    * @api private
    */
    function genNonce(len) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charlen = chars.length;

        return function() {
            var buf = [];
            for (var i = 0; i < len; ++i) {
                buf.push(chars[Math.random() * charlen | 0]);
            }
            return buf.join('');
        }
    }

    exports = module.exports = Mechanism;
}));

},{"buffer":68,"crypto":72}],116:[function(require,module,exports){
arguments[4][108][0].apply(exports,arguments)
},{"./lib/mechanism":115}],117:[function(require,module,exports){
(function(root, factory) {
  if (typeof exports === 'object') {
    // CommonJS
    factory(exports, module);
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports', 'module'], factory);
  }
}(this, function(exports, module) {
  
  /**
   * `Factory` constructor.
   *
   * @api public
   */
  function Factory() {
    this._mechs = [];
  }
  
  /**
   * Utilize the given `mech` with optional `name`, overridding the mechanism's
   * default name.
   *
   * Examples:
   *
   *     factory.use(FooMechanism);
   *
   *     factory.use('XFOO', FooMechanism);
   *
   * @param {String|Mechanism} name
   * @param {Mechanism} mech
   * @return {Factory} for chaining
   * @api public
   */
  Factory.prototype.use = function(name, mech) {
    if (!mech) {
      mech = name;
      name = mech.prototype.name;
    }
    this._mechs.push({ name: name, mech: mech });
    return this;
  };
  
  /**
   * Create a new mechanism from supported list of `mechs`.
   *
   * If no mechanisms are supported, returns `null`.
   *
   * Examples:
   *
   *     var mech = factory.create(['FOO', 'BAR']);
   *
   * @param {Array} mechs
   * @return {Mechanism}
   * @api public
   */
  Factory.prototype.create = function(mechs) {
    for (var i = 0, len = this._mechs.length; i < len; i++) {
      for (var j = 0, jlen = mechs.length; j < jlen; j++) {
        var entry = this._mechs[i];
        if (entry.name == mechs[j]) {
          return new entry.mech();
        }
      }
    }
    return null;
  };

  exports = module.exports = Factory;
  
}));

},{}],118:[function(require,module,exports){
(function(root, factory) {
  if (typeof exports === 'object') {
    // CommonJS
    factory(exports,
            module,
            require('./lib/factory'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define(['exports',
            'module',
            './lib/factory'], factory);
  }
}(this, function(exports, module, Factory) {
  
  exports = module.exports = Factory;
  exports.Factory = Factory;
  
}));

},{"./lib/factory":117}],119:[function(require,module,exports){
//     Underscore.js 1.5.2
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.5.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed > result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array, using the modern version of the 
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from an array.
  // If **n** is not specified, returns a single random element from the array.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (arguments.length < 2 || guard) {
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, value, context) {
      var result = {};
      var iterator = value == null ? _.identity : lookupIterator(value);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n == null) || guard ? array[0] : slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) {
      return array[array.length - 1];
    } else {
      return slice.call(array, Math.max(array.length - n, 0));
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;
    return function() {
      context = this;
      args = arguments;
      timestamp = new Date();
      var later = function() {
        var last = (new Date()) - timestamp;
        if (last < wait) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) result = func.apply(context, args);
        }
      };
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

},{}],120:[function(require,module,exports){
/*
WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based 
on @visionmedia's Emitter from UI Kit.

Why? I wanted it standalone.

I also wanted support for wildcard emitters like this:

emitter.on('*', function (eventName, other, event, payloads) {
    
});

emitter.on('somenamespace*', function (eventName, payloads) {
    
});

Please note that callbacks triggered by wildcard registered events also get 
the event name as the first argument.
*/
module.exports = WildEmitter;

function WildEmitter() {
    this.callbacks = {};
}

// Listen on the given `event` with `fn`. Store a group name if present.
WildEmitter.prototype.on = function (event, groupName, fn) {
    var hasGroup = (arguments.length === 3),
        group = hasGroup ? arguments[1] : undefined, 
        func = hasGroup ? arguments[2] : arguments[1];
    func._groupName = group;
    (this.callbacks[event] = this.callbacks[event] || []).push(func);
    return this;
};

// Adds an `event` listener that will be invoked a single
// time then automatically removed.
WildEmitter.prototype.once = function (event, groupName, fn) {
    var self = this,
        hasGroup = (arguments.length === 3),
        group = hasGroup ? arguments[1] : undefined, 
        func = hasGroup ? arguments[2] : arguments[1];
    function on() {
        self.off(event, on);
        func.apply(this, arguments);
    }
    this.on(event, group, on);
    return this;
};

// Unbinds an entire group
WildEmitter.prototype.releaseGroup = function (groupName) {
    var item, i, len, handlers;
    for (item in this.callbacks) {
        handlers = this.callbacks[item];
        for (i = 0, len = handlers.length; i < len; i++) {
            if (handlers[i]._groupName === groupName) {
                //console.log('removing');
                // remove it and shorten the array we're looping through
                handlers.splice(i, 1);
                i--;
                len--;
            }
        }
    }
    return this;
};

// Remove the given callback for `event` or all
// registered callbacks.
WildEmitter.prototype.off = function (event, fn) {
    var callbacks = this.callbacks[event],
        i;
    
    if (!callbacks) return this;

    // remove all handlers
    if (arguments.length === 1) {
        delete this.callbacks[event];
        return this;
    }

    // remove specific handler
    i = callbacks.indexOf(fn);
    callbacks.splice(i, 1);
    return this;
};

// Emit `event` with the given args.
// also calls any `*` handlers
WildEmitter.prototype.emit = function (event) {
    var args = [].slice.call(arguments, 1),
        callbacks = this.callbacks[event],
        specialCallbacks = this.getWildcardCallbacks(event),
        i,
        len,
        item;

    if (callbacks) {
        for (i = 0, len = callbacks.length; i < len; ++i) {
            if (callbacks[i]) {
                callbacks[i].apply(this, args);
            } else {
                break;
            }
        }
    }

    if (specialCallbacks) {
        for (i = 0, len = specialCallbacks.length; i < len; ++i) {
            if (specialCallbacks[i]) {
                specialCallbacks[i].apply(this, [event].concat(args));
            } else {
                break;
            }
        }
    }

    return this;
};

// Helper for for finding special wildcard event handlers that match the event
WildEmitter.prototype.getWildcardCallbacks = function (eventName) {
    var item,
        split,
        result = [];

    for (item in this.callbacks) {
        split = item.split('*');
        if (item === '*' || (split.length === 2 && eventName.slice(0, split[1].length) === split[1])) {
            result = result.concat(this.callbacks[item]);
        }
    }
    return result;
};

},{}]},{},[1])
(1)
});
;