(function(e){if("function"==typeof bootstrap)bootstrap("xmpp",e);else if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else if("undefined"!=typeof ses){if(!ses.ok())return;ses.makeXMPP=e}else"undefined"!=typeof window?window.XMPP=e():global.XMPP=e()})(function(){var define,ses,bootstrap,module,exports;
return (function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({1:[function(require,module,exports){
exports.Message = require('./lib/stanza/message');
exports.Presence = require('./lib/stanza/presence');
exports.Iq = require('./lib/stanza/iq');

exports.Client = require('./lib/client');

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
    client.use(require('./lib/plugins/webrtc'));
    client.use(require('./lib/plugins/pubsub'));
    client.use(require('./lib/plugins/avatar'));

    return client;
};

},{"./lib/client":2,"./lib/plugins/attention":3,"./lib/plugins/avatar":4,"./lib/plugins/carbons":5,"./lib/plugins/chatstates":6,"./lib/plugins/correction":7,"./lib/plugins/delayed":8,"./lib/plugins/disco":9,"./lib/plugins/forwarding":10,"./lib/plugins/idle":11,"./lib/plugins/invisible":12,"./lib/plugins/mam":13,"./lib/plugins/muc":14,"./lib/plugins/pubsub":15,"./lib/plugins/receipts":16,"./lib/plugins/time":17,"./lib/plugins/version":18,"./lib/plugins/webrtc":19,"./lib/stanza/iq":33,"./lib/stanza/message":35,"./lib/stanza/presence":37}],2:[function(require,module,exports){
(function(){var WildEmitter = require('wildemitter');
var _ = require('../vendor/lodash');
var async = require('async');
var uuid = require('node-uuid');
var SASL = require('./stanza/sasl');
var Message = require('./stanza/message');
var Presence = require('./stanza/presence');
var Iq = require('./stanza/iq');
var WSConnection = require('./websocket');
var getHostMeta = require('hostmeta');


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

    this.config = opts || {};
    this._idPrefix = uuid.v4();
    this._idCount = 0;

    this.negotiatedFeatures = {};
    this.featureOrder = [
        'sasl',
        'streamManagement',
        'bind',
        'streamManagement',
        'session'
    ];
    this.features = {};

    this.conn = new WSConnection();
    this.conn.on('*', function (eventName, data) {
        self.emit(eventName, data);    
    });

    this.on('streamFeatures', function (features) {
        var series = [function (cb) { cb(null, features); }];
        var seriesNames = ['setup'];

        self.featureOrder.forEach(function (name) {
            if (features._extensions[name] && !self.negotiatedFeatures[name]) {
                series.push(function (features, cb) {
                    if (!self.negotiatedFeatures[name]) {
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
                self.conn.restart();
            } else if (cmd === 'disconnect') {
                self.disconnect();
            }
        });
    });

    this.features.sasl = function (features, cb) {
        self.on('sasl:success', 'sasl', function () {
            self.negotiatedFeatures.sasl = true;
            self.releaseGroup('sasl');
            self.emit('auth:success');
            cb('restart');
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
   
        // Needs to extract mechs and pick the best one, but we need mech implementations first.
        self.send(new SASL.Auth({
            mechanism: 'PLAIN',
            value: '\x00' + self.config.username + '\x00' + self.config.password
        }));
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
            self.jid = resp.bind.jid;
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
            self.emit('session:started');
            cb(null, features);
        });
    };

    this.features.streamManagement = function (features, cb) {
        self.on('stream:management:enabled', 'sm', function (enabled) {
            self.conn.sm.enabled(enabled);
            self.negotiatedFeatures.streamManagement = true;

            self.on('stream:management:ack', 'connection', function (ack) {
                self.conn.sm.process(ack);
            });
            
            self.on('stream:management:request', 'connection', function (request) {
                self.conn.sm.ack();
            });

            self.releaseGroup('sm');
            cb(null, features);
        });

        self.on('stream:management:resumed', 'sm', function (resumed) {
            self.conn.sm.enabled(resumed);
            self.negotiatedFeatures.streamManagement = true;
            self.negotiatedFeatures.bind = true;
            self.sessionStarted = true;

            self.on('stream:management:ack', 'connection', function (ack) {
                self.conn.sm.process(ack);
            });
            
            self.on('stream:management:request', 'connection', function (request) {
                self.conn.sm.ack();
            });

            self.releaseGroup('sm');
            cb(null, features);
        });

        self.on('stream:management:failed', 'sm', function (failed) {
            self.conn.sm.failed();
            self.emit('session:end');
            self.releaseGroup('session');
            self.releaseGroup('sm');
            cb(null, features);
        });

        
        if (!self.conn.sm.id) {
            if (self.negotiatedFeatures.bind) {
                self.conn.sm.enable();
            } else {
                cb(null, features);
            }
        } else if (self.conn.sm.id && self.conn.sm.allowResume) {
            self.conn.sm.resume();
        } else {
            cb(null, features);
        }
    };

    this.on('disconnected', function () {
        self.sessionStarted = false;
        self.negotiatedFeatures.sasl = false;
        self.negotiatedFeatures.streamManagement = false;
        self.negotiatedFeatures.bind = false;
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

        if (iq.type === 'get' || iq.type === 'set') {
            // Invalid request
            if (children.length != 1) {
                return self.sendIq({
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
                return self.sendIq({
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
                self.sendIq({
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
    return this.conn ? this.conn.stream : undefined;
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

        _.each(links, function (link) {
            if (link.href && link.rel === 'urn:xmpp:altconnect:websocket') {
                results.push(link.href);
            }
        });

        cb(false, results);
    });
};

Client.prototype.connect = function () {
    var self = this;

    if (self.config.wsURL) {
        return self.conn.connect(self.config);
    }

    self.discoverBindings(self.config.server, function (err, endpoints) {
        if (!err && endpoints.length) {
            self.config.wsURL = endpoints[0];
            self.conn.connect(self.config);
        } else {
            self.disconnect();
        }
    });
};

Client.prototype.disconnect = function () {
    if (this.sessionStarted) {
        this.emit('session:end');
        this.releaseGroup('session');
    }
    this.sessionStarted = false;
    this.releaseGroup('connection');
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
    this.send(new Message(data));
};

Client.prototype.sendPresence = function (data) {
    data = data || {};
    if (!data.id) {
        data.id = this.nextId();
    }
    this.send(new Presence(data));
};

Client.prototype.sendIq = function (data, cb) {
    data = data || {};
    cb = cb || function () {};
    if (!data.id) {
        data.id = this.nextId();
    }
    if (data.type === 'get' || data.type === 'set') {
        this.once('id:' + data.id, 'session', function (resp) {
            if (resp._extensions.error) {
                cb(resp, null);
            } else {
                cb(null, resp);
            }
        });
    }
    this.send(new Iq(data));
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


module.exports = Client;

})()
},{"../vendor/lodash":77,"./stanza/bind":23,"./stanza/error":30,"./stanza/iq":33,"./stanza/message":35,"./stanza/presence":37,"./stanza/roster":41,"./stanza/sasl":43,"./stanza/session":44,"./stanza/sm":45,"./stanza/stream":46,"./stanza/streamError":47,"./stanza/streamFeatures":48,"./websocket":52,"async":53,"hostmeta":66,"node-uuid":75,"wildemitter":76}],3:[function(require,module,exports){
require('../stanza/attention');


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

},{"../stanza/attention":21}],4:[function(require,module,exports){
var stanzas = require('../stanza/avatar');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:avatar:metadata+notify');

    client.on('pubsubEvent', function (msg) {
        if (!msg.event._extensions.updated) return;
        if (msg.event.updated.node !== 'urn:xmpp:avatar:metadata') return;

        client.emit('avatar', {
            jid: msg.from,
            avatars: msg.updated.published[0].avatars
        });
    });

    client.publishAvatar = function (id, data, cb) {
        client.publish(null, 'urn:xmpp:avatar:data', {
            id: id,
            avatarData: data
        }, cb);
    };

    client.useAvatars = function (info, cb) {
        client.publish(null, 'urn:xmpp:avatar:metadata', {
            id: 'current',
            avatars: info
        }, cb);
    };
};

},{"../stanza/avatar":22}],5:[function(require,module,exports){
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

},{"../stanza/carbons":25}],6:[function(require,module,exports){
var stanzas = require('../stanza/chatstates');


module.exports = function (client) {
    client.disco.addFeature('http://jabber.org/protocol/chatstates');
};

},{"../stanza/chatstates":26}],7:[function(require,module,exports){
var stanzas = require('../stanza/replace');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:message-correct:0');

    client.on('message', function (msg) {
        if (msg.replace) {
            client.emit('replace:' + msg.id, msg);
        }
    });
};

},{"../stanza/replace":40}],8:[function(require,module,exports){
var stanzas = require('../stanza/delayed');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:delay');
};

},{"../stanza/delayed":28}],9:[function(require,module,exports){
(function(){/*global unescape, escape */

var _ = require('../../vendor/lodash');
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
    var computed = this._generatedVerString(info, hash);
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

    var ver = crypto.createHash(hash).update(UTF8.encode(S)).digest();
    var padding = 4 - ver.length % 4;

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
        this.disco.caps = {
            node: this.config.capsNode || 'https://stanza.io',
            hash: 'sha-1',
            ver: generateVerString({
                identities: this.disco.identities[''],
                features: this.disco.features[''],
                extensions: this.disco.extensions['']
            }, 'sha-1')
        };
    };

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
};

})()
},{"../../vendor/lodash":77,"../stanza/caps":24,"../stanza/disco":29,"crypto":60}],10:[function(require,module,exports){
var stanzas = require('../stanza/forwarded');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:forward:0');
};

},{"../stanza/forwarded":31}],11:[function(require,module,exports){
var stanzas = require('../stanza/idle');


module.exports = function (client) {
    client.disco.addFeature('urn:xmpp:idle:0');
};

},{"../stanza/idle":32}],12:[function(require,module,exports){
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

},{"../stanza/visibility":51}],13:[function(require,module,exports){
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

    client.on('message', function (msg) {
        if (msg._extensions.mam) {
            client.emit('mam:' + msg.mam.queryid, msg);
        }
    });
};

},{"../stanza/mam":34}],14:[function(require,module,exports){
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

},{"../stanza/muc":36}],15:[function(require,module,exports){
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

},{"../stanza/pubsub":38}],16:[function(require,module,exports){
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

},{"../stanza/receipts":39}],17:[function(require,module,exports){
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

},{"../stanza/time":49}],18:[function(require,module,exports){
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

},{"../stanza/version":50}],19:[function(require,module,exports){
var uuid = require('node-uuid');

// normalize environment
var RTCPeerConnection = null;
var RTCSessionDescription = null;
var RTCIceCandidate = null;
var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var browser = null;
var webRTCSupport = true;


if (navigator.mozGetUserMedia) {
    browser = "firefox";

    // The RTCPeerConnection object.
    RTCPeerConnection = window.mozRTCPeerConnection;

    // The RTCSessionDescription object.
    RTCSessionDescription = window.mozRTCSessionDescription;

    // The RTCIceCandidate object.
    RTCIceCandidate = window.mozRTCIceCandidate;

    // Get UserMedia (only difference is the prefix).
    // Code from Adam Barth.
    getUserMedia = navigator.mozGetUserMedia.bind(navigator);

    // Attach a media stream to an element.
    attachMediaStream = function (element, stream) {
        element.mozSrcObject = stream;
        element.play();
    };

    reattachMediaStream = function (to, from) {
        to.mozSrcObject = from.mozSrcObject;
        to.play();
    };

    // Fake get{Video,Audio}Tracks
    MediaStream.prototype.getVideoTracks = function () {
        return [];
    };

    MediaStream.prototype.getAudioTracks = function () {
        return [];
    };
} else if (navigator.webkitGetUserMedia) {
    browser = "chrome";

    // The RTCPeerConnection object.
    RTCPeerConnection = window.webkitRTCPeerConnection;

    // Get UserMedia (only difference is the prefix).
    // Code from Adam Barth.
    getUserMedia = navigator.webkitGetUserMedia.bind(navigator);

    // Attach a media stream to an element.
    attachMediaStream = function (element, stream) {
        element.autoplay = true;
        element.src = webkitURL.createObjectURL(stream);
    };

    reattachMediaStream = function (to, from) {
        to.src = from.src;
    };

    // The representation of tracks in a stream is changed in M26.
    // Unify them for earlier Chrome versions in the coexisting period.
    if (!webkitMediaStream.prototype.getVideoTracks) {
        webkitMediaStream.prototype.getVideoTracks = function () {
            return this.videoTracks;
        };
        webkitMediaStream.prototype.getAudioTracks = function () {
            return this.audioTracks;
        };
    }

    // New syntax of getXXXStreams method in M26.
    if (!window.webkitRTCPeerConnection.prototype.getLocalStreams) {
        window.webkitRTCPeerConnection.prototype.getLocalStreams = function () {
            return this.localStreams;
        };
        window.webkitRTCPeerConnection.prototype.getRemoteStreams = function () {
            return this.remoteStreams;
        };
    }
} else {
    webRTCSupport = false;
}

 
function WebRTC(client) {
    var self = this;

    this.client = client;
    this.peerConnectionConfig = {
        iceServers: browser == 'firefox' ? [{url: 'stun:124.124.124.2'}] : [{url: 'stun:stun.l.google.com:19302'}]
    };
    this.peerConnectionConstraints = {
        optional: [{DtlsSrtpKeyAgreement: true}]
    };
    this.media = {
        audio: true,
        video: {
            mandatory: {},
            optional: []
        }
    };
    this.sessions = {};
    this.peerSessions = {};

    this.attachMediaStream = attachMediaStream;

    // check for support
    if (!webRTCSupport) {
        client.emit('webrtc:unsupported');
        return self;
    } else {
        client.emit('webrtc:supported');

        client.disco.addFeature('http://stanza.io/protocol/sox');

        client.on('message', function (msg) {
            if (msg.type !== 'error' && msg._extensions.sox) {
                var session;
                var fullId = msg.from + ':' + msg.sox.sid;

                if (msg.sox.type === 'offer') {
                    console.log('got an offer');
                    session = new Peer(client, msg.from, msg.sox.sid);
                    self.sessions[fullId] = session;
                    if (!self.peerSessions[msg.from]) {
                        self.peerSessions[msg.from] = [];
                    }
                    self.peerSessions[msg.from].push(fullId);
                } else if (msg.sox.type === 'answer') {
                    console.log('got an answer');
                    session = self.sessions[fullId];
                    if (session) {
                        console.log('Setting remote description');
                        session.conn.setRemoteDescription(new RTCSessionDescription({
                            type: 'answer',
                            sdp: msg.sox.sdp
                        }));
                    }
                } else if (msg.sox.type === 'candidate') {
                    session = self.sessions[fullId];
                    if (session) {
                        console.log('Adding new ICE candidate');
                        session.conn.addIceCandidate(new RTCIceCandidate({
                            sdpMLineIndex: msg.sox.label,
                            candidate: msg.sox.sdp
                        }));
                    }
                }
                client.emit('webrtc:' + msg.sox.type, msg);
            }
        });
    }
}

WebRTC.prototype = {
    constructor: {
        value: WebRTC
    },
    testReadiness: function () {
        var self = this;
        if (this.localStream && this.client.sessionStarted) {
            // This timeout is a workaround for the strange no-audio bug
            // as described here: https://code.google.com/p/webrtc/issues/detail?id=1525
            // remove timeout when this is fixed.
            setTimeout(function () {
                self.client.emit('webrtc:ready');
            }, 1000);
        }
    },
    startLocalMedia: function (element) {
        var self = this;
        getUserMedia(this.media, function (stream) {
            attachMediaStream(element, stream);
            self.localStream = stream;
            self.testReadiness();
        }, function () {
            throw new Error('Failed to get access to local media.');
        });
    },
    offerSession: function (peer) {
        var self = this;
        var sid = uuid.v4();
        var session = new Peer(this.client, peer, sid);

        this.sessions[peer + ':' + sid] = session;
        if (!this.peerSessions[peer]) {
            this.peerSessions[peer] = [];
        }
        this.peerSessions[peer].push(peer + ':' + sid);

        session.conn.createOffer(function (sdp) {
            console.log('Setting local description');
            session.conn.setLocalDescription(sdp);
            console.log('Sending offer');
            self.client.sendMessage({
                to: peer,
                sox: {
                    type: 'offer',
                    sid: sid,
                    sdp: sdp.sdp
                }
            });
        }, null, this.mediaConstraints);
    },
    acceptSession: function (offerMsg) {
        var self = this;
        var session = self.sessions[offerMsg.from + ':' + offerMsg.sox.sid];

        if (session) {
            console.log('Setting remote description');
            session.conn.setRemoteDescription(new RTCSessionDescription({
                type: 'offer',
                sdp: offerMsg.sox.sdp
            }));
            session.conn.createAnswer(function (sdp) {
                console.log('Setting local description');
                session.conn.setLocalDescription(sdp);
                console.log('Sending answer');
                self.client.sendMessage({
                    to: session.jid,
                    sox: {
                        type: 'answer',
                        sid: session.sid,
                        sdp: sdp.sdp
                    }
                });
            }, null, this.mediaConstraints);
        }
    },
    declineSession: function (offerMsg) {
        this.endSession(offerMsg.from, offerMsg.sox.sid);
    },
    endSession: function (peer, sid) {
        var session = this.sessions[peer + ':' + sid];
        if (session) {
            var fullId = peer + ':' + sid;
            var index = this.peerSessions[peer].indexOf(fullId);

            if (index != -1) {
                this.peerSessions.splice(index, 1);
            }
            this.sessions[fullId] = undefined;

            session.conn.close();
            this.client.emit('webrtc:stream:removed', {
                sid: session.sid,
                peer: session.jid
            });

            this.client.sendMessage({
                to: peer,
                sox: {
                    type: 'end',
                    sid: sid
                }
            });
        }
    },
    // Audio controls
    mute: function () {
        this._audioEnabled(false);
        this.client.emit('webrtc:audio:off');
    },
    unmute: function () {
        this._audioEnabled(true);
        this.client.emit('webrtc:audio:on');
    },
    // Video controls
    pauseVideo: function () {
        this._videoEnabled(false);
        this.client.emit('webrtc:video:off');
    },
    resumeVideo: function () {
        this._videoEnabled(true);
        this.client.emit('webrtc:video:on');
    },
    // Combined controls
    pause: function () {
        this.mute();
        this.pauseVideo();
    },
    resume: function () {
        this.unmute();
        this.resumeVideo();
    },
    // Internal methods for enabling/disabling audio/video
    _audioEnabled: function (bool) {
        this.localStream.getAudioTracks().forEach(function (track) {
            track.enabled = !!bool;
        });
    },
    _videoEnabled: function (bool) {
        this.localStream.getVideoTracks().forEach(function (track) {
            track.enabled = !!bool;
        });
    }
};


function Peer(client, jid, sid) {
    var self = this;

    this.client = client;
    this.jid = jid;
    this.sid = sid;
    this.closed = false;

    this.conn = new RTCPeerConnection(client.webrtc.peerConnectionConfig, client.webrtc.peerConnectionConstraints);
    this.conn.addStream(client.webrtc.localStream);
    this.conn.onicecandidate = function (event) {
        if (self.closed) return;
        if (event.candidate) {
            console.log('Sending candidate');
            self.client.sendMessage({
                mto: self.jid,
                sox: {
                    type: 'candidate',
                    sid: self.sid,
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    sdp: event.candidate.candidate
                }
            });
        } else {
            console.log('End of ICE candidates');
        }
    };
    this.conn.onaddstream = function (event) {
        self.client.emit('webrtc:stream:added', {
            stream: event.stream,
            sid: self.sid,
            peer: self.jid
        });
    };
    this.conn.onremovestream = function (event) {
        self.client.emit('webrtc:stream:removed', {
            sid: self.sid,
            peer: self.jid
        });
    };

    this.mediaConstraints = {
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        }
    };
}

Peer.prototype = {
    constructor: {
        value: Peer
    }
};


module.exports = function (client) {
    client.webrtc = new WebRTC(client);
};

},{"node-uuid":75}],20:[function(require,module,exports){
(function(){var SM = require('./stanza/sm');
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
    this.windowCount = 0;
    this.unacked = [];
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
        this.windowCount = 0;
        this.unacked = [];
    },
    ack: function () {
        this.conn.send(new SM.Ack({
            h: this.handled
        }));
    },
    request: function () {
        this.conn.send(new SM.Request());
    },
    process: function (ack, resend) {
        var self = this;
        var numAcked = mod(ack.h - this.lastAck, MAX_SEQ);

        for (var i = 0; i < numAcked && this.unacked.length > 0; i++) {
            this.conn.emit('stanza:acked', this.unacked.shift());
        }
        if (resend) {
            var resendUnacked = this.unacked;
            this.unacked = [];
            resendUnacked.forEach(function (stanza) {
                self.conn.send(stanza); 
            });
        }
        this.lastAck = ack.h;
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
            this.windowCount += 1;
            if (this.windowCount == this.windowSize) {
                this.request();
                this.windowCount = 0;
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

})()
},{"./stanza/sm":45}],21:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');


function Attention(data, xml) {
    return stanza.init(this, xml, data);
}
Attention.prototype = {
    constructor: {
        value: Attention 
    },
    NS: 'urn:xmpp:attention:0',
    EL: 'attention',
    _name: '_attention',
    toString: stanza.toString,
    toJSON: undefined
};

Message.prototype.__defineGetter__('attention', function () {
    return !!this._extensions._attention;
});
Message.prototype.__defineSetter__('attention', function (value) {    
    if (value) {
        this._attention = true;
    } else if (this._extensions._attention) {
        this.xml.removeChild(this._extensions._attention.xml);
        delete this._extensions._attention;
    }
});


stanza.extend(Message, Attention);

module.exports = Attention;

},{"./message":35,"jxt":73}],22:[function(require,module,exports){
var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Item = require('./pubsub').Item;
var EventItem = require('./pubsub').EventItem;


function getAvatarData() {
    return stanza.getSubText(this.xml, 'urn:xmpp:avatar:data', 'data');
}

function setAvatarData(value) {
    stanza.setSubText(this.xml, 'urn:xmpp:avatar:data', 'data', value);
    stanza.setSubAttribute(this.xml, 'urn:xmpp:avatar:data', 'data', 'xmlns', 'urn:xmpp:avatar:data');
}

function getAvatars() {
    var metadata = stanza.find(this.xml, 'urn:xmpp:avatar:metadata', 'metadata'); 
    var results = [];
    if (metadata.length) {
        var avatars = stanza.find(metadata[0], 'urn:xmpp:avatar:metadata', 'info');
        _.forEach(avatars, function (info) {
            results.push(new Avatar({}, info));
        });
    }
    return results;
}

function setAvatars(value) {
    var metadata = stanza.findOrCreate(this.xml, 'urn:xmpp:avatar:metadata', 'metadata');
    stanza.setAttribute(metadata, 'xmlns', 'urn:xmpp:avatar:metadata');
    _.forEach(value, function (info) {
        var avatar = new Avatar(info);
        metadata.appendChild(avatar.xml);
    });
}


Item.prototype.__defineGetter__('avatarData', getAvatarData);
Item.prototype.__defineSetter__('avatarData', setAvatarData);
EventItem.prototype.__defineGetter__('avatarData', getAvatarData);
EventItem.prototype.__defineSetter__('avatarData', setAvatarData);

Item.prototype.__defineGetter__('avatars', getAvatars);
Item.prototype.__defineSetter__('avatars', setAvatars);
EventItem.prototype.__defineGetter__('avatars', getAvatars);
EventItem.prototype.__defineSetter__('avatars', setAvatars);



function Avatar(data, xml) {
    return stanza.init(this, xml, data);
}
Avatar.prototype = {
    constructor: {
        value: Avatar
    },
    _name: 'avatars',
    NS: 'urn:xmpp:avatar:metadata',
    EL: 'info',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get bytes() {
        return stanza.getAttribute(this.xml, 'bytes');
    },
    set bytes(value) {
        stanza.setAttribute(this.xml, 'bytes', value);
    },
    get height() {
        return stanza.getAttribute(this.xml, 'height');
    },
    set height(value) {
        stanza.setAttribute(this.xml, 'height', value);
    },
    get width() {
        return stanza.getAttribute(this.xml, 'width');
    },
    set width(value) {
        stanza.setAttribute(this.xml, 'width', value);
    },
    get type() {
        return stanza.getAttribute(this.xml, 'type', 'image/png');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'type', value);
    },
    get url() {
        return stanza.getAttribute(this.xml, 'url');
    },
    set url(value) {
        stanza.setAttribute(this.xml, 'url', value);
    }
};


module.exports = Avatar;

},{"../../vendor/lodash":77,"./pubsub":38,"jxt":73}],23:[function(require,module,exports){
var stanza = require('jxt');
var Iq = require('./iq');
var StreamFeatures = require('./streamFeatures');


function Bind(data, xml) {
    return stanza.init(this, xml, data);
}
Bind.prototype = {
    constructor: {
        value: Bind
    },
    _name: 'bind',
    NS: 'urn:ietf:params:xml:ns:xmpp-bind',
    EL: 'bind',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get resource() {
        return stanza.getSubText(this.xml, this.NS, 'resource');
    },
    set resource(value) {
        stanza.setSubText(this.xml, this.NS, 'resource');
    },
    get jid() {
        return stanza.getSubText(this.xml, this.NS, 'jid');
    },
    set jid(value) {
        stanza.setSubText(this.xml, this.NS, 'jid');
    }
};


stanza.extend(Iq, Bind);
stanza.extend(StreamFeatures, Bind);


module.exports = Bind;

},{"./iq":33,"./streamFeatures":48,"jxt":73}],24:[function(require,module,exports){
var stanza = require('jxt');
var Presence = require('./presence');
var StreamFeatures = require('./streamFeatures');


function Caps(data, xml) {
    return stanza.init(this, xml, data);
}
Caps.prototype = {
    constructor: {
        value: Caps 
    },
    NS: 'http://jabber.org/protocol/caps',
    EL: 'c',
    _name: 'caps',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get ver() {
        return stanza.getAttribute(this.xml, 'ver');
    },
    set ver(value) {
        stanza.setAttribute(this.xml, 'ver', value);
    },
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get hash() {
        return stanza.getAttribute(this.xml, 'hash');
    },
    set hash(value) {
        stanza.setAttribute(this.xml, 'hash', value);
    },
    get ext() {
        return stanza.getAttribute(this.xml, 'ext');
    },
    set ext(value) {
        stanza.setAttribute(this.xml, 'ext', value);
    }
};


stanza.extend(Presence, Caps);
stanza.extend(StreamFeatures, Caps);


module.exports = Caps;

},{"./presence":37,"./streamFeatures":48,"jxt":73}],25:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');
var Iq = require('./iq');
var Forwarded = require('./forwarded');


function Sent(data, xml) {
    return stanza.init(this, xml, data);
}
Sent.prototype = {
    constructor: {
        value: Sent
    },
    NS: 'urn:xmpp:carbons:2',
    EL: 'sent',
    _name: 'carbonSent',
    _eventname: 'carbon:sent',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Received(data, xml) {
    return stanza.init(this, xml, data);
}
Received.prototype = {
    constructor: {
        value: Received
    },
    NS: 'urn:xmpp:carbons:2',
    EL: 'received',
    _name: 'carbonReceived',
    _eventname: 'carbon:received',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Private(data, xml) {
    return stanza.init(this, xml, data);
}
Private.prototype = {
    constructor: {
        value: Private 
    },
    NS: 'urn:xmpp:carbons:2',
    EL: 'private',
    _name: 'carbonPrivate',
    _eventname: 'carbon:private',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Enable(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Enable
    },
    NS: 'urn:xmpp:carbons:2',
    EL: 'enable',
    _name: 'enableCarbons',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Disable(data, xml) {
    return stanza.init(this, xml, data);
}
Disable.prototype = {
    constructor: {
        value: Disable
    },
    NS: 'urn:xmpp:carbons:2',
    EL: 'disable',
    _name: 'disableCarbons',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(Sent, Forwarded);
stanza.extend(Received, Forwarded);
stanza.extend(Message, Sent);
stanza.extend(Message, Received);
stanza.extend(Message, Private);
stanza.extend(Iq, Enable);
stanza.extend(Iq, Disable);


exports.Sent = Sent;
exports.Received = Received;
exports.Private = Private;
exports.Enable = Enable;
exports.Disable = Disable;

},{"./forwarded":31,"./iq":33,"./message":35,"jxt":73}],26:[function(require,module,exports){
var stanza = require('jxt');
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

},{"./message":35,"jxt":73}],27:[function(require,module,exports){
var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Message = require('./message');


function DataForm(data, xml) {
    return stanza.init(this, xml, data);
}
DataForm.prototype = {
    constructor: {
        value: DataForm 
    },
    NS: 'jabber:x:data',
    EL: 'x',
    _name: 'form',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get title() {
        return stanza.getSubText(this.xml, this.NS, 'title');
    },
    set title(value) {
        stanza.setSubText(this.xml, this.NS, 'title', value);
    },
    get instructions() {
        return stanza.getMultiSubText(this.xml, this.NS, 'title').join('\n');
    },
    set instructions(value) {
        stanza.setMultiSubText(this.xml, this.NS, 'title', value.split('\n'));
    },
    get type() {
        return stanza.getAttribute(this.xml, 'type', 'form');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'type', value);
    },
    get fields() {
        var fields = stanza.find(this.xml, this.NS, 'field');
        var results = [];

        _.forEach(fields, function (field) {
            results.push(new Field({}, field).toJSON());
        });
        return results;
    },
    set fields(value) {
        var self = this;
        _.forEach(value, function (field) {
            self.addField(field); 
        });
    },
    addField: function (opts) {
        var field = new Field(opts);
        this.xml.appendChild(field.xml);
    },
};


function Field(data, xml) {
    stanza.init(this, xml, data);
    this._type = data.type || this.type;
    return this;
}
Field.prototype = {
    constructor: {
        value: Field
    },
    NS: 'jabber:x:data',
    EL: 'field',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get type() {
        return stanza.getAttribute(this.xml, 'type', 'text-single');
    },
    set type(value) {
        this._type = value;
        stanza.setAttribute(this.xml, 'type', value);
    },
    get name() {
        return stanza.getAttribute(this.xml, 'var');
    },
    set name(value) {
        stanza.setAttribute(this.xml, 'var', value);
    },
    get desc() {
        return stanza.getSubText(this.xml, this.NS, 'desc');
    },
    set desc(value) {
        stanza.setSubText(this.xml, this.NS, 'desc', value);
    },
    get value() {
        var vals = stanza.getMultiSubText(this.xml, this.NS, 'value');
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
    set value(value) {
        if (this._type === 'boolean') {
            stanza.setSubText(this.xml, this.NS, 'value', value ? '1' : '0');
        } else {
            if (this._type === 'text-multi') {
                value = value.split('\n');
            }
            stanza.setMultiSubText(this.xml, this.NS, 'value', value);
        }
    },
    get required() {
        var req = stanza.find(this.xml, this.NS, 'required');
        return req.length > 0;
    },
    set required(value) {
        var reqs = stanza.find(this.xml, this.NS, 'required');
        if (value && reqs.length === 0) {
            var req = document.createElementNS(this.NS, 'required');
            this.xml.appendChild(req);
        } else if (!value && reqs.length > 0) {
            _.forEach(reqs, function (req) {
                this.xml.removeChild(req);
            });
        }
    },
    get label() {
        return stanza.getAttribute(this.xml, 'label');
    },
    set label(value) {
        stanza.setAttribute(this.xml, 'label', value);
    },
    get options() {
        var self = this;
        return stanza.getMultiSubText(this.xml, this.NS, 'option', function (sub) {
            return stanza.getSubText(sub, self.NS, 'value');
        });
    },
    set options(value) {
        var self = this;
        stanza.setMultiSubText(this.xml, this.NS, 'option', value, function (val) {
            var opt = document.createElementNS(self.NS, 'option');
            var value = document.createElementNS(self.NS, 'value');

            opt.appendChild(value);
            value.textContent = val;
            self.xml.appendChild(opt);
        });
    }
};


stanza.extend(Message, DataForm);


exports.DataForm = DataForm;
exports.Field = Field;

},{"../../vendor/lodash":77,"./message":35,"jxt":73}],28:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');


function DelayedDelivery(data, xml) {
    return stanza.init(this, xml, data);
}
DelayedDelivery.prototype = {
    constructor: {
        value: DelayedDelivery
    },
    NS: 'urn:xmpp:delay',
    EL: 'delay',
    _name: 'delay',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get from() {
        return stanza.getAttribute(this.xml, 'from');
    },
    set from(value) {
        stanza.setAttribute(this.xml, 'from', value);
    },
    get stamp() {
        return new Date(stanza.getAttribute(this.xml, 'stamp'));
    },
    set stamp(value) {
        stanza.setAttribute(this.xml, 'stamp', value.toISOString());
    },
    get reason() {
        return this.xml.textContent || '';
    },
    set reason(value) {
        this.xml.textContent = value;
    }
};


stanza.extend(Message, DelayedDelivery);
stanza.extend(Presence, DelayedDelivery);


module.exports = DelayedDelivery;

},{"./message":35,"./presence":37,"jxt":73}],29:[function(require,module,exports){
var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Iq = require('./iq');
var RSM = require('./rsm');
var DataForm = require('./dataforms').DataForm;


function DiscoInfo(data, xml) {
    return stanza.init(this, xml, data);
}
DiscoInfo.prototype = {
    constructor: {
        value: DiscoInfo
    },
    _name: 'discoInfo',
    NS: 'http://jabber.org/protocol/disco#info',
    EL: 'query',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get identities() {
        var result = [];
        var identities = stanza.find(this.xml, this.NS, 'identity');
        _.each(identities, function (identity) {
            result.push({
                category: stanza.getAttribute(identity, 'category'),
                type: stanza.getAttribute(identity, 'type'),
                lang: identity.getAttributeNS(stanza.XML_NS, 'lang'),
                name: stanza.getAttribute(identity, 'name')
            });
        });
        return result;
    },
    set identities(values) {
        var self = this;

        var existing = stanza.find(this.xml, this.NS, 'identity');
        _.each(existing, function (item) {
            this.xml.removeChild(item);
        });
        _.each(values, function (value) {
            var identity = document.createElementNS(self.NS, 'identity');
            stanza.setAttribute(identity, 'category', value.category);
            stanza.setAttribute(identity, 'type', value.type);
            stanza.setAttribute(identity, 'name', value.name);
            if (value.lang) {
                identity.setAttributeNS(stanza.XML_NS, 'lang', value.lang);
            }
            self.xml.appendChild(identity);
        });

    },
    get features() {
        var result = [];
        var features = stanza.find(this.xml, this.NS, 'feature');
        _.each(features, function (feature) {
            result.push(feature.getAttribute('var'));
        });
        return result;
    },
    set features(values) {
        var self = this;

        var existing = stanza.find(this.xml, this.NS, 'feature');
        _.each(existing, function (item) {
            self.xml.removeChild(item);
        });
        _.each(values, function (value) {
            var feature = document.createElementNS(self.NS, 'feature');
            feature.setAttribute('var', value);
            self.xml.appendChild(feature);
        });
    },
    get extensions() {
        var self = this;
        var result = [];

        var forms = stanza.find(this.xml, DataForm.NS, DataForm.EL);
        _.forEach(forms, function (form) {
            var ext = new DataForm({}, form);
            result.push(ext.toJSON());
        });
    },
    set extensions(value) {
        var self = this;

        var forms = stanza.find(this.xml, DataForm.NS, DataForm.EL);
        _.forEach(forms, function (form) {
            self.xml.removeChild(form);
        });

        _.forEach(value, function (ext) {
            var form = new DataForm(ext);
            self.xml.appendChild(form.xml);
        });
    }
};


function DiscoItems(data, xml) {
    return stanza.init(this, xml, data);
}
DiscoItems.prototype = {
    constructor: {
        value: DiscoInfo
    },
    _name: 'discoItems',
    NS: 'http://jabber.org/protocol/disco#items',
    EL: 'query',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get items() {
        var result = [];
        var items = stanza.find(this.xml, this.NS, 'item');
        _.each(items, function (item) {
            result.push({
                jid: stanza.getAttribute(item, 'jid'),
                node: stanza.getAttribute(item, 'node'),
                name: stanza.getAttribute(item, 'name')
            });
        });
        return result;
    },
    set items(values) {
        var self = this;

        var existing = stanza.find(this.xml, this.NS, 'item');
        _.each(existing, function (item) {
            self.xml.removeChild(item);
        });
        _.each(values, function (value) {
            var item = document.createElementNS(self.NS, 'item');
            stanza.setAttribute(item, 'jid', value.jid);
            stanza.setAttribute(item, 'node', value.node);
            stanza.setAttribute(item, 'name', value.name);
            self.xml.appendChild(item);
        });
    }
};


stanza.extend(Iq, DiscoInfo);
stanza.extend(Iq, DiscoItems);
stanza.extend(DiscoItems, RSM);

exports.DiscoInfo = DiscoInfo;
exports.DiscoItems = DiscoItems;

},{"../../vendor/lodash":77,"./dataforms":27,"./iq":33,"./rsm":42,"jxt":73}],30:[function(require,module,exports){
var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');


function Error(data, xml) {
    return stanza.init(this, xml, data);
}
Error.prototype = {
    constructor: {
        value: Error
    },
    _name: 'error',
    NS: 'jabber:client',
    EL: 'error',
    _ERR_NS: 'urn:ietf:params:xml:ns:xmpp-stanzas',
    _CONDITIONS: [
        'bad-request', 'conflict', 'feature-not-implemented',
        'forbidden', 'gone', 'internal-server-error',
        'item-not-found', 'jid-malformed', 'not-acceptable',
        'not-allowed', 'not-authorized', 'payment-required',
        'recipient-unavailable', 'redirect',
        'registration-required', 'remote-server-not-found',
        'remote-server-timeout', 'resource-constraint',
        'service-unavailable', 'subscription-required',
        'undefined-condition', 'unexpected-request'
    ],
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang() {
        if (this.parent) {
            return this.parent.lang;
        }
        return '';
    },
    get condition() {
        var self = this;
        var result = [];
        _.each(this._CONDITIONS, function (condition) {
            var exists = stanza.find(self.xml, self._ERR_NS, condition);
            if (exists.length) {
                result.push(exists[0].tagName);
            }
        });
        return result[0] || '';
    },
    set condition(value) {
        var self = this;
        _.each(this._CONDITIONS, function (condition) {
            var exists = stanza.find(self.xml, self._ERR_NS, condition);
            if (exists.length) {
                self.xml.removeChild(exists[0]);
            }
        });

        if (value) {
            var condition = document.createElementNS(this._ERR_NS, value);
            condition.setAttribute('xmlns', this._ERR_NS);
            this.xml.appendChild(condition);
        }
    },
    get gone() {
        return stanza.getSubText(this.xml, this._ERR_NS, 'gone');
    },
    set gone(value) {
        this.condition = 'gone';
        stanza.setSubText(this.xml, this._ERR_NS, 'gone', value);
    },
    get redirect() {
        return stanza.getSubText(this.xml, this._ERR_NS, 'redirect');
    },
    set redirect(value) {
        this.condition = 'redirect';
        stanza.setSubText(this.xml, this._ERR_NS, 'redirect', value);
    },
    get code() {
        return stanza.getAttribute(this.xml, 'code');
    },
    set code(value) {
        stanza.setAttribute(this.xml, 'code', value);
    },
    get type() {
        return stanza.getAttribute(this.xml, 'type');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'type', value);
    },
    get by() {
        return stanza.getAttribute(this.xml, 'by');
    },
    set by(value) {
        stanza.setAttribute(this.xml, 'by', value);
    },
    get $text() {
        return stanza.getSubLangText(this.xml, this._ERR_NS, 'text', this.lang);
    },
    set text(value) {
        stanza.setSubLangText(this.xml, this._ERR_NS, 'text', value, this.lang);
    },
    get text() {
        var text = this.$text;
        return text[this.lang] || '';
    },
};

stanza.extend(Message, Error);
stanza.extend(Presence, Error);
stanza.extend(Iq, Error);


module.exports = Error;

},{"../../vendor/lodash":77,"./iq":33,"./message":35,"./presence":37,"jxt":73}],31:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');
var DelayedDelivery = require('./delayed');


function Forwarded(data, xml) {
    return stanza.init(this, xml, data);
}
Forwarded.prototype = {
    constructor: {
        value: Forwarded 
    },
    NS: 'urn:xmpp:forward:0',
    EL: 'forwarded',
    _name: 'forwarded',
    _eventname: 'forward',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(Message, Forwarded);
stanza.extend(Forwarded, Message);
stanza.extend(Forwarded, Presence);
stanza.extend(Forwarded, Iq);
stanza.extend(Forwarded, DelayedDelivery);


module.exports = Forwarded;

},{"./delayed":28,"./iq":33,"./message":35,"./presence":37,"jxt":73}],32:[function(require,module,exports){
var stanza = require('jxt');
var Presence = require('./presence');


function Idle(data, xml) {
    return stanza.init(this, xml, data);
}
Idle.prototype = {
    constructor: {
        value: Idle 
    },
    NS: 'urn:xmpp:idle:0',
    EL: 'idle',
    _name: 'idle',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get since() {
        return new Date(stanza.getAttribute(this.xml, 'since'));
    },
    set since(value) {
        stanza.setAttribute(this.xml, 'since', value.toISOString());
    }
};


stanza.extend(Presence, Idle);


module.exports = Idle;

},{"./presence":37,"jxt":73}],33:[function(require,module,exports){
var stanza = require('jxt');


function Iq(data, xml) {
    return stanza.init(this, xml, data);
}
Iq.prototype = {
    constructor: {
        value: Iq 
    },
    _name: 'iq',
    NS: 'jabber:client',
    EL: 'iq',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    resultReply: function (data) {
        data.to = this.from;
        data.id = this.id;
        data.type = 'result';
        return new Iq(data);
    },
    errorReply: function (data) {
        data.to = this.from;
        data.id = this.id;
        data.type = 'error';
        return new Iq(data);
    },
    get lang() {
        return this.xml.getAttributeNS(stanza.XML_NS, 'lang') || '';
    },
    set lang(value) {
        this.xml.setAttributeNS(stanza.XML_NS, 'lang', value);
    },
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get to() {
        return stanza.getAttribute(this.xml, 'to');
    },
    set to(value) {
        stanza.setAttribute(this.xml, 'to', value);
    },
    get from() {
        return stanza.getAttribute(this.xml, 'from');
    },
    set from(value) {
        stanza.setAttribute(this.xml, 'from', value);
    },
    get type() {
        return stanza.getAttribute(this.xml, 'type');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'type', value);
    }
};

stanza.topLevel(Iq);


module.exports = Iq;

},{"jxt":73}],34:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');
var Iq = require('./iq');
var Forwarded = require('./forwarded');
var RSM = require('./rsm');


function MAMQuery(data, xml) {
    return stanza.init(this, xml, data);
}
MAMQuery.prototype = {
    constructor: {
        value: MAMQuery
    },
    NS: 'urn:xmpp:mam:tmp',
    EL: 'query',
    _name: 'mamQuery',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get queryid() {
        return stanza.getAttribute(this.xml, 'queryid');
    },
    set queryid(value) {
        stanza.setAttribute(this.xml, 'queryid', value);
    },
    get start() {
        return new Date(stanza.getSubText(this.xml, this.NS, 'start') || '');
    },
    set start(value) {
        stanza.setSubText(this.xml, this.NS, 'start', value.toISOString());
    },
    get end() {
        return new Date(stanza.getSubText(this.xml, this.NS, 'end') || '');
    },
    set end(value) {
        stanza.setSubText(this.xml, this.NS, 'end', value.toISOString());
    }
};
MAMQuery.prototype.__defineGetter__('with', function () {
    return stanza.getSubText(this.xml, this.NS, 'with');
});
MAMQuery.prototype.__defineSetter__('with', function (value) {
    stanza.setSubText(this.xml, this.NS, 'with', value);
});


function Result(data, xml) {
    return stanza.init(this, xml, data);
}
Result.prototype = {
    constructor: {
        value: Result
    },
    NS: 'urn:xmpp:mam:tmp',
    EL: 'result',
    _name: 'mam',
    _eventname: 'mam:result',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get queryid() {
        return stanza.getAttribute(this.xml, 'queryid');
    },
    set queryid(value) {
        stanza.setAttribute(this.xml, 'queryid', value);
    },
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    }
};


function Archived(data, xml) {
    return stanza.init(this, xml, data);
}
Archived.prototype = {
    constructor: {
        value: Result
    },
    NS: 'urn:xmpp:mam:tmp',
    EL: 'archived',
    _name: 'archived',
    _eventname: 'mam:archived',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get by() {
        return stanza.getAttribute(this.xml, 'by');
    },
    set by(value) {
        stanza.setAttribute(this.xml, 'by', value);
    },
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    }
};


stanza.extend(Iq, MAMQuery);
stanza.extend(Message, Result);
stanza.extend(Message, Archived);
stanza.extend(Result, Forwarded);
stanza.extend(MAMQuery, RSM);

exports.MAMQuery = MAMQuery;
exports.Result = Result;

},{"./forwarded":31,"./iq":33,"./message":35,"./rsm":42,"jxt":73}],35:[function(require,module,exports){
var _ = require('../../vendor/lodash');
var stanza = require('jxt');


function Message(data, xml) {
    return stanza.init(this, xml, data);
}
Message.prototype = {
    constructor: {
        value: Message
    },
    _name: 'message',
    NS: 'jabber:client',
    EL: 'message',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang() {
        return this.xml.getAttributeNS(stanza.XML_NS, 'lang') || '';
    },
    set lang(value) {
        this.xml.setAttributeNS(stanza.XML_NS, 'lang', value);
    },
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get to() {
        return stanza.getAttribute(this.xml, 'to');
    },
    set to(value) {
        stanza.setAttribute(this.xml, 'to', value);
    },
    get from() {
        return stanza.getAttribute(this.xml, 'from');
    },
    set from(value) {
        stanza.setAttribute(this.xml, 'from', value);
    },
    get type() {
        return stanza.getAttribute(this.xml, 'type', 'normal');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'type', value);
    },
    get body() {
        var bodies = this.$body;
        return bodies[this.lang] || '';
    },
    get $body() {
        return stanza.getSubLangText(this.xml, this.NS, 'body', this.lang);
    },
    set body(value) {
        stanza.setSubLangText(this.xml, this.NS, 'body', value, this.lang);
    },
    get thread() {
        return stanza.getSubText(this.xml, this.NS, 'thread');
    },
    set thread(value) {
        stanza.setSubText(this.xml, this.NS, 'thread', value);
    },
    get parentThread() {
        return stanza.getSubAttribute(this.xml, this.NS, 'thread', 'parent');
    },
    set parentThread(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'thread', 'parent', value);
    }
};

stanza.topLevel(Message);


module.exports = Message;

},{"../../vendor/lodash":77,"jxt":73}],36:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');


function MUCJoin(data, xml) {
    return stanza.init(this, xml, data);
}
MUCJoin.prototype = {
    constructor: {
        value: MUCJoin 
    },
    NS: 'http://jabber.org/protocol/muc',
    EL: 'x',
    _name: 'joinMuc',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get password() {
        return stanza.getSubText(this.xml, this.NS, 'password');
    },
    set password(value) {
        stanza.setSubText(this.xml, this.NS, 'password', value);
    },
    get history() {
        var result = {};
        var hist = stanza.find(this.xml, this.NS, 'history');

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
    set history(opts) {
        var existing = stanza.find(this.xml, this.NS, 'history');
        if (existing.length) {
            for (var i = 0; i < existing.length; i++) {
                this.xml.removeChild(existing[i]);
            }
        }

        var hist = document.createElementNS(this.NS, 'history');
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
};


stanza.extend(Presence, MUCJoin);

exports.MUCJoin = MUCJoin;

},{"./iq":33,"./message":35,"./presence":37,"jxt":73}],37:[function(require,module,exports){
var _ = require('../../vendor/lodash');
var stanza = require('jxt');


function Presence(data, xml) {
    return stanza.init(this, xml, data);
}
Presence.prototype = {
    constructor: {
        value: Presence
    },
    _name: 'presence',
    NS: 'jabber:client',
    EL: 'presence',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang() {
        return this.xml.getAttributeNS(stanza.XML_NS, 'lang') || '';
    },
    set lang(value) {
        this.xml.setAttributeNS(stanza.XML_NS, 'lang', value);
    },
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get to() {
        return stanza.getAttribute(this.xml, 'to');
    },
    set to(value) {
        stanza.setAttribute(this.xml, 'to', value);
    },
    get from() {
        return stanza.getAttribute(this.xml, 'from');
    },
    set from(value) {
        stanza.setAttribute(this.xml, 'from', value);
    },
    get type() {
        return stanza.getAttribute(this.xml, 'type', 'available');
    },
    set type(value) {
        if (value === 'available') {
            value = false;
        }
        stanza.setAttribute(this.xml, 'type', value);
    },
    get status() {
        var statuses = this.$status;
        return statuses[this.lang] || '';
    },
    get $status() {
        return stanza.getSubLangText(this.xml, this.NS, 'status', this.lang);
    },
    set status(value) {
        stanza.setSubLangText(this.xml, this.NS, 'status', value, this.lang);
    },
    get priority() {
        return stanza.getSubText(this.xml, this.NS, 'priority');
    },
    set priority(value) {
        stanza.setSubText(this.xml, this.NS, 'priority', value);
    },
    get show() {
        return stanza.getSubText(this.xml, this.NS, 'show');
    },
    set show(value) {
        stanza.setSubText(this.xml, this.NS, 'show', value);
    }
};

stanza.topLevel(Presence);


module.exports = Presence;

},{"../../vendor/lodash":77,"jxt":73}],38:[function(require,module,exports){
var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Iq = require('./iq');
var Message = require('./message');
var Form = require('./dataforms').DataForm;
var RSM = require('./rsm');


function Pubsub(data, xml) {
    return stanza.init(this, xml, data);
}
Pubsub.prototype = {
    constructor: {
        value: Pubsub
    },
    _name: 'pubsub',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'pubsub',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get publishOptions() {
        var conf = stanza.find(this.xml, this.NS, 'publish-options');
        if (conf.length && conf[0].childNodes.length) {
            return new Form({}, conf[0].childNodes[0]);
        }
    },
    set publishOptions(value) {
        var conf = stanza.findOrCreate(this.xml, this.NS, 'publish-options');
        if (value) {
            var form = new Form(value);
            conf.appendChild(form.xml);
        }
    }
};


function PubsubOwner(data, xml) {
    return stanza.init(this, xml, data);
}
PubsubOwner.prototype = {
    constructor: {
        value: PubsubOwner
    },
    _name: 'pubsubOwner',
    NS: 'http://jabber.org/protocol/pubsub#owner',
    EL: 'pubsub',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get create() {
        return stanza.getSubAttribute(this.xml, this.NS, 'create', 'node');
    },
    set create(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'create', 'node', value);
    },
    get purge() {
        return stanza.getSubAttribute(this.xml, this.NS, 'purge', 'node');
    },
    set purge(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'purge', 'node', value);
    },
    get del() {
        return stanza.getSubAttribute(this.xml, this.NS, 'delete', 'node');
    },
    set del(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'delete', 'node', value);
    },
    get redirect() {
        var del = stanza.find(this.xml, this.NS, 'delete');
        if (del.length) {
            return stanza.getSubAttribute(del, this.NS, 'redirect', 'uri');
        }
        return '';
    },
    set redirect(value) {
        var del = stanza.findOrCreate(this.xml, this.NS, 'delete');
        stanza.setSubAttribute(del, this.NS, 'redirect', 'uri', value);
    }
};


function Configure(data, xml) {
    return stanza.init(this, xml, data);
}
Configure.prototype = {
    constructor: {
        value: Configure
    },
    _name: 'config',
    NS: 'http://jabber.org/protocol/pubsub#owner',
    EL: 'configure',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    }
};


function Event(data, xml) {
    return stanza.init(this, xml, data);
}
Event.prototype = {
    constructor: {
        value: Event
    },
    _name: 'event',
    NS: 'http://jabber.org/protocol/pubsub#event',
    EL: 'event',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Subscribe(data, xml) {
    return stanza.init(this, xml, data);
}
Subscribe.prototype = {
    constructor: {
        value: Subscribe
    },
    _name: 'subscribe',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'subscribe',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get jid() {
        return stanza.getAttribute(this.xml, 'jid');
    },
    set jid(value) {
        stanza.setAttribute(this.xml, 'jid', value);
    }
};


function Subscription(data, xml) {
    return stanza.init(this, xml, data);
}
Subscription.prototype = {
    constructor: {
        value: Subscription
    },
    _name: 'subscription',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'subscription',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get jid() {
        return stanza.getAttribute(this.xml, 'jid');
    },
    set jid(value) {
        stanza.setAttribute(this.xml, 'jid', value);
    },
    get subid() {
        return stanza.getAttribute(this.xml, 'subid');
    },
    set subid(value) {
        stanza.setAttribute(this.xml, 'subid', value);
    },
    get type() {
        return stanza.getAttribute(this.xml, 'subscription');
    },
    set type(value) {
        stanza.setAttribute(this.xml, 'subscription', value);
    }
};


function Unsubscribe(data, xml) {
    return stanza.init(this, xml, data);
}
Unsubscribe.prototype = {
    constructor: {
        value: Unsubscribe
    },
    _name: 'unsubscribe',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'unsubscribe',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get jid() {
        return stanza.getAttribute(this.xml, 'jid');
    },
    set jid(value) {
        stanza.setAttribute(this.xml, 'jid', value);
    }
};


function Publish(data, xml) {
    return stanza.init(this, xml, data);
}
Publish.prototype = {
    constructor: {
        value: Publish
    },
    _name: 'publish',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'publish',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get item() {
        var items = this.items;
        if (items.length) {
            return items[0];
        }
    },
    set item(value) {
        this.items = [value];
    }
};


function Retract(data, xml) {
    return stanza.init(this, xml, data);
}
Retract.prototype = {
    constructor: {
        value: Retract 
    },
    _name: 'retract',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'retract',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get notify() {
        var notify = stanza.getAttribute(this.xml, 'notify');
        return notify === 'true' || notify === '1';
    },
    set notify(value) {
        if (value) {
            value = '1';
        }
        stanza.setAttribute(this.xml, 'notify', value);
    },
    get id() {
        return stanza.getSubAttribute(this.xml, this.NS, 'item', 'id');
    },
    set id(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'item', 'id', value);
    }
};


function Retrieve(data, xml) {
    return stanza.init(this, xml, data);
}
Retrieve.prototype = {
    constructor: {
        value: Retrieve
    },
    _name: 'retrieve',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'items',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get max() {
        return stanza.getAttribute(this.xml, 'max_items');
    },
    set max(value) {
        stanza.setAttribute(this.xml, 'max_items', value);
    }
};


function Item(data, xml) {
    return stanza.init(this, xml, data);
}
Item.prototype = {
    constructor: {
        value: Item 
    },
    _name: 'item',
    NS: 'http://jabber.org/protocol/pubsub',
    EL: 'item',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    }
};


function EventItems(data, xml) {
    return stanza.init(this, xml, data);
}
EventItems.prototype = {
    constructor: {
        value: EventItems
    },
    _name: 'updated',
    NS: 'http://jabber.org/protocol/pubsub#event',
    EL: 'items',
    toString: stanza.toString,
    toJSON: function () {
        var json = stanza.toJSON.apply(this);
        var items = [];
        _.forEach(json.published, function (item) {
            items.push(item.toJSON());
        });
        json.published = items;
        return json;
    },
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get published() {
        var results = [];
        var items = stanza.find(this.xml, this.NS, 'item');

        _.forEach(items, function (xml) {
            results.push(new EventItem({}, xml));
        });
        return results;
    },
    set published(value) {
        var self = this;
        _.forEach(value, function (data) {
            var item = new EventItem(data);
            this.xml.appendChild(item.xml);
        });
    },
    get retracted() {
        var results = [];
        var retracted = stanza.find(this.xml, this.NS, 'retract');

        _.forEach(retracted, function (xml) {
            results.push(xml.getAttribute('id'));
        });
        return results;
    },
    set retracted(value) {
        var self = this;
        _.forEach(value, function (id) {
            var retracted = document.createElementNS(self.NS, 'retract');
            retracted.setAttribute('id', id);
            this.xml.appendChild(retracted);
        });
    }
};


function EventItem(data, xml) {
    return stanza.init(this, xml, data);
}
EventItem.prototype = {
    constructor: {
        value: EventItem
    },
    _name: 'eventItem',
    NS: 'http://jabber.org/protocol/pubsub#event',
    EL: 'item',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get node() {
        return stanza.getAttribute(this.xml, 'node');
    },
    set node(value) {
        stanza.setAttribute(this.xml, 'node', value);
    },
    get publisher() {
        return stanza.getAttribute(this.xml, 'publisher');
    },
    set publisher(value) {
        stanza.setAttribute(this.xml, 'publisher', value);
    }
};


stanza.extend(Pubsub, Subscribe);
stanza.extend(Pubsub, Unsubscribe);
stanza.extend(Pubsub, Publish);
stanza.extend(Pubsub, Retrieve);
stanza.extend(Pubsub, Subscription);
stanza.extend(PubsubOwner, Configure);
stanza.extend(Publish, Item);
stanza.extend(Configure, Form);
stanza.extend(Pubsub, RSM);
stanza.extend(Event, EventItems);
stanza.extend(Message, Event);
stanza.extend(Iq, Pubsub);
stanza.extend(Iq, PubsubOwner);

exports.Pubsub = Pubsub;
exports.Item = Item;
exports.EventItem = EventItem;

},{"../../vendor/lodash":77,"./dataforms":27,"./iq":33,"./message":35,"./rsm":42,"jxt":73}],39:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');


function Request(data, xml) {
    return stanza.init(this, xml, data);
}
Request.prototype = {
    constructor: {
        value: Request
    },
    NS: 'urn:xmpp:receipts',
    EL: 'request',
    _name: '_requestReceipt',
    toString: stanza.toString,
    toJSON: undefined
};


function Received(data, xml) {
    return stanza.init(this, xml, data);
}
Received.prototype = {
    constructor: {
        value: Received 
    },
    NS: 'urn:xmpp:receipts',
    EL: 'received',
    _name: 'receipt',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    }
};


Message.prototype.__defineGetter__('requestReceipt', function () {
    return !!this._extensions._requestReceipt;
});
Message.prototype.__defineSetter__('requestReceipt', function (value) {    
    if (value) {
        this._requestReceipt = true;
    } else if (this._extensions._requestReceipt) {
        this.xml.removeChild(this._extensions._requestReceipt.xml);
        delete this._extensions._requestReceipt;
    }
});


stanza.extend(Message, Received);
stanza.extend(Message, Request);

exports.Request = Request;
exports.Received = Received;

},{"./message":35,"jxt":73}],40:[function(require,module,exports){
var stanza = require('jxt');
var Message = require('./message');


function Replace(data, xml) {
    return stanza.init(this, xml, data);
}
Replace.prototype = {
    constructor: {
        value: Replace 
    },
    NS: 'urn:xmpp:message-correct:0',
    EL: 'replace',
    _name: '_replace',
    toString: stanza.toString,
    toJSON: undefined,
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    }
};


stanza.extend(Message, Replace);

Message.prototype.__defineGetter__('replace', function () {
    if (this._extensions._replace) {
        return this._replace.id;
    }
    return '';
});
Message.prototype.__defineSetter__('replace', function (value) {    
    if (value) {
        this._replace.id = value;
    } else if (this._extensions._replace) {
        this.xml.removeChild(this._extensions._replace.xml);
        delete this._extensions._replace;
    }
});


module.exports = Replace;

},{"./message":35,"jxt":73}],41:[function(require,module,exports){
var _ = require('../../vendor/lodash');
var stanza = require('jxt');
var Iq = require('./iq');


function Roster(data, xml) {
    return stanza.init(this, xml, data);
}
Roster.prototype = {
    constructor: {
        value: Roster
    },
    _name: 'roster',
    NS: 'jabber:iq:roster',
    EL: 'query',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get ver() {
        return stanza.getAttribute(this.xml, 'ver');
    },
    set ver(value) {
        var force = (value === '');
        stanza.setAttribute(this.xml, 'ver', value, force);
    },
    get items() {
        var self = this;

        var items = stanza.find(this.xml, this.NS, 'item');
        if (!items.length) {
            return [];
        }
        var results = [];
        _.each(items, function (item) {
            var data = {
                jid: stanza.getAttribute(item, 'jid', undefined),
                _name: stanza.getAttribute(item, 'name', undefined),
                subscription: stanza.getAttribute(item, 'subscription', 'none'),
                ask: stanza.getAttribute(item, 'ask', undefined),
                groups: []
            };
            var groups = stanza.find(item, self.NS, 'group');
            _.each(groups, function (group) {
                data.groups.push(group.textContent);
            });
            results.push(data);
        });
        return results;
    },
    set items(values) {
        var self = this;
        _.each(values, function (value) {
            var item = document.createElementNS(self.NS, 'item');
            stanza.setAttribute(item, 'jid', value.jid);
            stanza.setAttribute(item, 'name', value.name);
            stanza.setAttribute(item, 'subscription', value.subscription);
            stanza.setAttribute(item, 'ask', value.ask);
            _.each(value.groups || [], function (name) {
                var group = document.createElementNS(self.NS, 'group');
                group.textContent = name;
                item.appendChild(group);
            });
            self.xml.appendChild(item);
        });
    }
};


stanza.extend(Iq, Roster);


module.exports = Roster;

},{"../../vendor/lodash":77,"./iq":33,"jxt":73}],42:[function(require,module,exports){
var stanza = require('jxt');


function RSM(data, xml) {
    return stanza.init(this, xml, data);
}
RSM.prototype = {
    constructor: {
        value: RSM 
    },
    NS: 'http://jabber.org/protocol/rsm',
    EL: 'set',
    _name: 'rsm',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get after() {
        return stanza.getSubText(this.xml, this.NS, 'after');
    },
    set after(value) {
        stanza.setSubText(this.xml, this.NS, 'after', value);
    },
    get before() {
        return stanza.getSubText(this.xml, this.NS, 'before');
    },
    set before(value) {
        stanza.setSubText(this.xml, this.NS, 'before', value);
    },
    get count() {
        return parseInt(stanza.getSubText(this.xml, this.NS, 'count') || '0', 10);
    },
    set count(value) {
        stanza.setSubText(this.xml, this.NS, 'count', value.toString());
    },
    get first() {
        return stanza.getSubText(this.xml, this.NS, 'first');
    },
    set first(value) {
        stanza.setSubText(this.xml, this.NS, 'first', value);
    },
    get firstIndex() {
        return stanza.getSubAttribute(this.xml, this.NS, 'first', 'index');
    },
    set firstIndex(value) {
        stanza.setSubAttribute(this.xml, this.NS, 'first', 'index', value);
    },
    get index() {
        return stanza.getSubText(this.xml, this.NS, 'index');
    },
    set index(value) {
        stanza.setSubText(this.xml, this.NS, 'index', value);
    },
    get last() {
        return stanza.getSubText(this.xml, this.NS, 'last');
    },
    set last(value) {
        stanza.setSubText(this.xml, this.NS, 'last', value);
    },
    get max() {
        return stanza.getSubText(this.xml, this.NS, 'max');
    },
    set max(value) {
        stanza.setSubText(this.xml, this.NS, 'max', value.toString());
    }
};


module.exports = RSM;

},{"jxt":73}],43:[function(require,module,exports){
var stanza = require('jxt');
var _ = require('../../vendor/lodash');
var StreamFeatures = require('./streamFeatures');


function Mechanisms(data, xml) {
    return stanza.init(this, xml, data);
}
Mechanisms.prototype = {
    constructor: {
        value: Mechanisms
    },
    _name: 'sasl',
    NS: 'urn:ietf:params:xml:ns:xmpp-sasl',
    EL: 'mechanisms',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    required: true,
    get mechanisms() {
        var result = [];
        var mechs = stanza.find(this.xml, this.NS, 'mechanism');
        if (mechs.length) {
            _.each(mechs, function (mech) {
                result.push(mech.textContent);
            });
        }
        return result;
    },
    set mechanisms(value) {
        var self = this;
        var mechs = stanza.find(this.xml, this.NS, 'mechanism');
        if (mechs.length) {
            _.each(mechs, function (mech) {
                self.xml.remove(mech);
            });
        }
        _.each(value, function (name) {
            var mech = document.createElementNS(self.NS, 'mechanism');
            mech.textContent = name;
            self.xml.appendChild(mech);
        });
    }
};


function Auth(data, xml) {
    return stanza.init(this, xml, data);
}
Auth.prototype = {
    constructor: {
        value: Auth 
    },
    _name: 'saslAuth',
    _eventname: 'sasl:auth',
    NS: 'urn:ietf:params:xml:ns:xmpp-sasl',
    EL: 'auth',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get value() {
        return atob(this.xml.textContent);
    },
    set value(value) {
        this.xml.textContent = btoa(value) || '=';
    },
    get mechanism() {
        return stanza.getAttribute(this.xml, 'mechanism');
    },
    set mechanism(value) {
        stanza.setAttribute(this.xml, 'mechanism', value);
    }
};


function Challenge(data, xml) {
    return stanza.init(this, xml, data);
}
Challenge.prototype = {
    constructor: {
        value: Challenge 
    },
    _name: 'saslChallenge',
    _eventname: 'sasl:challenge',
    NS: 'urn:ietf:params:xml:ns:xmpp-sasl',
    EL: 'challenge',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get value() {
        return atob(this.xml.textContent);
    },
    set value(value) {
        this.xml.textContent = btoa(value) || '=';
    }
};


function Response(data, xml) {
    return stanza.init(this, xml, data);
}
Response.prototype = {
    constructor: {
        value: Response 
    },
    _name: 'saslResponse',
    _eventname: 'sasl:response',
    NS: 'urn:ietf:params:xml:ns:xmpp-sasl',
    EL: 'response',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get value() {
        return atob(this.xml.textContent);
    },
    set value(value) {
        this.xml.textContent = btoa(value) || '=';
    }
};


function Success(data, xml) {
    return stanza.init(this, xml, data);
}
Success.prototype = {
    constructor: {
        value: Success
    },
    _name: 'saslSuccess',
    _eventname: 'sasl:success',
    NS: 'urn:ietf:params:xml:ns:xmpp-sasl',
    EL: 'success',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get value() {
        return atob(this.xml.textContent);
    },
    set value(value) {
        this.xml.textContent = btoa(value) || '=';
    }
};


function Failure(data, xml) {
    return stanza.init(this, xml, data);
}
Failure.prototype = {
    constructor: {
        value: Success
    },
    _CONDITIONS: [
        'aborted', 'account-disabled', 'credentials-expired',
        'encryption-required', 'incorrect-encoding', 'invalid-authzid',
        'invalid-mechanism', 'malformed-request', 'mechanism-too-weak',
        'not-authorized', 'temporary-auth-failure',
    ],
    _name: 'saslFailure',
    _eventname: 'sasl:failure',
    NS: 'urn:ietf:params:xml:ns:xmpp-sasl',
    EL: 'failure',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang() {
        return this._lang || '';
    },
    set lang(value) {
        this._lang = value;
    },
    get condition() {
        var self = this;
        var result = [];
        _.each(this._CONDITIONS, function (condition) {
            var exists = stanza.find(self.xml, this.NS, condition);
            if (exists.length) {
                result.push(exists[0].tagName);
            }
        });
        return result[0] || '';
    },
    set condition(value) {
        var self = this;
        _.each(this._CONDITIONS, function (condition) {
            var exists = stanza.find(self.xml, self.NS, condition);
            if (exists.length) {
                self.xml.removeChild(exists[0]);
            }
        });

        if (value) {
            var condition = document.createElementNS(this.NS, value);
            condition.setAttribute('xmlns', this.NS);
            this.xml.appendChild(condition);
        }
    },
    get text() {
        var text = this.$text;
        return text[this.lang] || '';
    },
    get $text() {
        return stanza.getSubLangText(this.xml, this.NS, 'text', this.lang);
    },
    set text(value) {
        stanza.setSubLangText(this.xml, this.NS, 'text', value, this.lang);
    }
};


function Abort(data, xml) {
    return stanza.init(this, xml, data);
}
Abort.prototype = {
    constructor: {
        value: Abort 
    },
    _name: 'saslAbort',
    _eventname: 'sasl:abort',
    NS: 'urn:ietf:params:xml:ns:xmpp-sasl',
    EL: 'abort',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(StreamFeatures, Mechanisms, 'sasl');
stanza.topLevel(Auth);
stanza.topLevel(Challenge);
stanza.topLevel(Response);
stanza.topLevel(Success);
stanza.topLevel(Failure);
stanza.topLevel(Abort);


exports.Mechanisms = Mechanisms;
exports.Auth = Auth;
exports.Challenge = Challenge;
exports.Response = Response;
exports.Success = Success;
exports.Failure = Failure;
exports.Abort = Abort;

},{"../../vendor/lodash":77,"./streamFeatures":48,"jxt":73}],44:[function(require,module,exports){
var stanza = require('jxt');
var Iq = require('./iq');
var StreamFeatures = require('./streamFeatures');


function Session(data, xml) {
    return stanza.init(this, xml, data);
}
Session.prototype = {
    constructor: {
        value: Session
    },
    _name: 'session',
    NS: 'urn:ietf:params:xml:ns:xmpp-session',
    EL: 'session',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(StreamFeatures, Session);
stanza.extend(Iq, Session);


module.exports = Session;

},{"./iq":33,"./streamFeatures":48,"jxt":73}],45:[function(require,module,exports){
var stanza = require('jxt');
var StreamFeatures = require('./streamFeatures');


function SMFeature(data, xml) {
    return stanza.init(this, xml, data);
}
SMFeature.prototype = {
    constructor: {
        value: SMFeature
    },
    _name: 'streamManagement',
    NS: 'urn:xmpp:sm:3',
    EL: 'sm',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Enable(data, xml) {
    return stanza.init(this, xml, data);
}
Enable.prototype = {
    constructor: {
        value: Enable
    },
    _name: 'smEnable',
    _eventname: 'stream:management:enable',
    NS: 'urn:xmpp:sm:3',
    EL: 'enable',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get resume() {
        return stanza.getBoolAttribute(this.xml, 'resume');
    },
    set resume(val) {
        stanza.setBoolAttribute(this.xml, 'resume', val);
    }
};


function Enabled(data, xml) {
    return stanza.init(this, xml, data);
}
Enabled.prototype = {
    constructor: {
        value: Enabled
    },
    _name: 'smEnabled',
    _eventname: 'stream:management:enabled',
    NS: 'urn:xmpp:sm:3',
    EL: 'enabled',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get resume() {
        return stanza.getBoolAttribute(this.xml, 'resume');
    },
    set resume(val) {
        stanza.setBoolAttribute(this.xml, 'resume', val);
    }
};


function Resume(data, xml) {
    return stanza.init(this, xml, data);
}
Resume.prototype = {
    constructor: {
        value: Resume
    },
    _name: 'smResume',
    _eventname: 'stream:management:resume',
    NS: 'urn:xmpp:sm:3',
    EL: 'resume',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get h() {
        return parseInt(stanza.getAttribute(this.xml, 'h', '0'), 10);
    },
    set h(value) {
        stanza.setAttribute(this.xml, 'h', '' + value);
    },
    get previd() {
        return stanza.getAttribute(this.xml, 'previd');
    },
    set previd(value) {
        stanza.setAttribute(this.xml, 'previd', value);
    }
};


function Resumed(data, xml) {
    return stanza.init(this, xml, data);
}
Resumed.prototype = {
    constructor: {
        value: Resumed
    },
    _name: 'smResumed',
    _eventname: 'stream:management:resumed',
    NS: 'urn:xmpp:sm:3',
    EL: 'resumed',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get h() {
        return parseInt(stanza.getAttribute(this.xml, 'h', '0'), 10);
    },
    set h(value) {
        stanza.setAttribute(this.xml, 'h', '' + value);
    },
    get previd() {
        return stanza.getAttribute(this.xml, 'previd');
    },
    set previd(value) {
        stanza.setAttribute(this.xml, 'previd', value);
    }
};


function Failed(data, xml) {
    return stanza.init(this, xml, data);
}
Failed.prototype = {
    constructor: {
        value: Failed
    },
    _name: 'smFailed',
    _eventname: 'stream:management:failed',
    NS: 'urn:xmpp:sm:3',
    EL: 'failed',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


function Ack(data, xml) {
    return stanza.init(this, xml, data);
}
Ack.prototype = {
    constructor: {
        value: Ack
    },
    _name: 'smAck',
    _eventname: 'stream:management:ack',
    NS: 'urn:xmpp:sm:3',
    EL: 'a',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get h() {
        return parseInt(stanza.getAttribute(this.xml, 'h', '0'), 10);
    },
    set h(value) {
        stanza.setAttribute(this.xml, 'h', '' + value);
    }
};


function Request(data, xml) {
    return stanza.init(this, xml, data);
}
Request.prototype = {
    constructor: {
        value: Request
    },
    _name: 'smRequest',
    _eventname: 'stream:management:request',
    NS: 'urn:xmpp:sm:3',
    EL: 'r',
    toString: stanza.toString,
    toJSON: stanza.toJSON
};


stanza.extend(StreamFeatures, SMFeature);
stanza.topLevel(Ack);
stanza.topLevel(Request);
stanza.topLevel(Enable);
stanza.topLevel(Enabled);
stanza.topLevel(Resume);
stanza.topLevel(Resumed);
stanza.topLevel(Failed);


exports.SMFeature = SMFeature;
exports.Enable = Enable;
exports.Enabled = Enabled;
exports.Resume = Resume;
exports.Resumed = Resumed;
exports.Failed = Failed;
exports.Ack = Ack;
exports.Request = Request;

},{"./streamFeatures":48,"jxt":73}],46:[function(require,module,exports){
var stanza = require('jxt');


function Stream(data, xml) {
    return stanza.init(this, xml, data);
}
Stream.prototype = {
    constructor: {
        value: Stream
    },
    _name: 'stream',
    NS: 'http://etherx.jabber.org/streams',
    EL: 'stream',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang() {
        return this.xml.getAttributeNS(stanza.XML_NS, 'lang') || '';
    },
    set lang(value) {
        this.xml.setAttributeNS(stanza.XML_NS, 'lang', value);
    },
    get id() {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id(value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get version() {
        return stanza.getAttribute(this.xml, 'version', '1.0');
    },
    set version(value) {
        stanza.setAttribute(this.xml, 'version', value);
    },
    get to() {
        return stanza.getAttribute(this.xml, 'to');
    },
    set to(value) {
        stanza.setAttribute(this.xml, 'to', value);
    },
    get from() {
        return stanza.getAttribute(this.xml, 'from');
    },
    set from(value) {
        stanza.setAttribute(this.xml, 'from', value);
    }
}; 

module.exports = Stream;

},{"jxt":73}],47:[function(require,module,exports){
var _ = require('../../vendor/lodash');
var stanza = require('jxt');


function StreamError(data, xml) {
    return stanza.init(this, xml, data);
}
StreamError.prototype = {
    constructor: {
        value: StreamError
    },
    _name: 'streamError',
    NS: 'http://etherx.jabber.org/streams',
    EL: 'error',
    _ERR_NS: 'urn:ietf:params:xml:ns:xmpp-streams',
    _CONDITIONS: [
        'bad-format', 'bad-namespace-prefix', 'conflict',
        'connection-timeout', 'host-gone', 'host-unknown',
        'improper-addressing', 'internal-server-error', 'invalid-from',
        'invalid-namespace', 'invalid-xml', 'not-authorized',
        'not-well-formed', 'policy-violation', 'remote-connection-failed',
        'reset', 'resource-constraint', 'restricted-xml', 'see-other-host',
        'system-shutdown', 'undefined-condition', 'unsupported-encoding',
        'unsupported-feature', 'unsupported-stanza-type',
        'unsupported-version'
    ],
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get lang() {
        return this._lang || '';
    },
    set lang(value) {
        this._lang = value;
    },
    get condition() {
        var self = this;
        var result = [];
        _.each(this._CONDITIONS, function (condition) {
            var exists = stanza.find(self.xml, self._ERR_NS, condition);
            if (exists.length) {
                result.push(exists[0].tagName);
            }
        });
        return result[0] || '';
    },
    set condition(value) {
        var self = this;
        _.each(this._CONDITIONS, function (condition) {
            var exists = stanza.find(self.xml, self._ERR_NS, condition);
            if (exists.length) {
                self.xml.removeChild(exists[0]);
            }
        });

        if (value) {
            var condition = document.createElementNS(this._ERR_NS, value);
            condition.setAttribute('xmlns', this._ERR_NS);
            this.xml.appendChild(condition);
        }
    },
    get seeOtherHost() {
        return stanza.getSubText(this.xml, this._ERR_NS, 'see-other-host');
    },
    set seeOtherHost(value) {
        this.condition = 'see-other-host';
        stanza.setSubText(this.xml, this._ERR_NS, 'see-other-host', value);
    },
    get text() {
        var text = this.$text;
        return text[this.lang] || '';
    },
    get $text() {
        return stanza.getSubLangText(this.xml, this._ERR_NS, 'text', this.lang);
    },
    set text(value) {
        stanza.setSubLangText(this.xml, this._ERR_NS, 'text', value, this.lang);
    }
};

stanza.topLevel(StreamError);


module.exports = StreamError;

},{"../../vendor/lodash":77,"jxt":73}],48:[function(require,module,exports){
var stanza = require('jxt');


function StreamFeatures(data, xml) {
    return stanza.init(this, xml, data);
}
StreamFeatures.prototype = {
    constructor: {
        value: StreamFeatures
    },
    _name: 'streamFeatures',
    NS: 'http://etherx.jabber.org/streams',
    EL: 'features',
    _FEATURES: [],
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get features() {
        return this._extensions;
    }
};

stanza.topLevel(StreamFeatures);


module.exports = StreamFeatures;

},{"jxt":73}],49:[function(require,module,exports){
var stanza = require('jxt');
var Iq = require('./iq');


function EntityTime(data, xml) {
    return stanza.init(this, xml, data);
}
EntityTime.prototype = {
    constructor: {
        value: EntityTime 
    },
    NS: 'urn:xmpp:time',
    EL: 'time',
    _name: 'time',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get tzo() {
        var split, hrs, min;
        var sign = -1;
        var formatted = stanza.getSubText(this.xml, this.NS, 'tzo');

        if (!formatted) {
            return 0;
        }
        if (formatted.charAt(0) === '-') {
            sign = 1;
            formatted.slice(1);
        }
        split = formatted.split(':');
        hrs = parseInt(split[0], 10);
        min = parseInt(split[1], 10);
        return (hrs * 60 + min) * sign;
    },
    set tzo(value) {
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
        stanza.setSubText(this.xml, this.NS, 'tzo', formatted);
    },
    get utc() {
        var stamp = stanza.getSubText(this.xml, this.NS, 'utc');
        if (stamp) {
            return new Date(stamp);
        }
        return '';
    },
    set utc(value) {
        stanza.setSubText(this.xml, this.NS, 'utc', value.toISOString());
    }
};


stanza.extend(Iq, EntityTime);

module.exports = EntityTime;

},{"./iq":33,"jxt":73}],50:[function(require,module,exports){
var stanza = require('jxt');
var Iq = require('./iq');


function Version(data, xml) {
    return stanza.init(this, xml, data);
}
Version.prototype = {
    constructor: {
        value: Version 
    },
    NS: 'jabber:iq:version',
    EL: 'query',
    _name: 'version',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get name() {
        return stanza.getSubText(this.xml, this.NS, 'name');
    },
    set name(value) {
        stanza.setSubText(this.xml, this.NS, 'name', value);
    },
    get version() {
        return stanza.getSubText(this.xml, this.NS, 'version');
    },
    set version(value) {
        stanza.setSubText(this.xml, this.NS, 'version', value);
    },
    get os() {
        return stanza.getSubText(this.xml, this.NS, 'os');
    },
    set os(value) {
        stanza.setSubText(this.xml, this.NS, 'os', value);
    }
};


stanza.extend(Iq, Version);


module.exports = Version;

},{"./iq":33,"jxt":73}],51:[function(require,module,exports){
var stanza = require('jxt');
var Iq = require('./iq');


function Visible(data, xml) {
    return stanza.init(this, xml, data);
}
Visible.prototype = {
    constructor: {
        value: Visible 
    },
    NS: 'urn:xmpp:invisible:0',
    EL: 'visible',
    _name: '_visible',
    toString: stanza.toString,
    toJSON: undefined
};


function Invisible(data, xml) {
    return stanza.init(this, xml, data);
}
Invisible.prototype = {
    constructor: {
        value: Invisible 
    },
    NS: 'urn:xmpp:invisible:0',
    EL: 'invisible',
    _name: '_invisible',
    toString: stanza.toString,
    toJSON: undefined
};



Iq.prototype.__defineGetter__('visible', function () {
    return !!this._extensions._visible;
});
Iq.prototype.__defineSetter__('visible', function (value) {    
    if (value) {
        this._visible = true;
    } else if (this._extensions._visible) {
        this.xml.removeChild(this._extensions._visible.xml);
        delete this._extensions._visible;
    }
});


Iq.prototype.__defineGetter__('invisible', function () {
    return !!this._extensions._invisible;
});
Iq.prototype.__defineSetter__('invisible', function (value) {    
    if (value) {
        this._invisible = true;
    } else if (this._extensions._invisible) {
        this.xml.removeChild(this._extensions._invisible.xml);
        delete this._extensions._invisible;
    }
});


stanza.extend(Iq, Visible);
stanza.extend(Iq, Invisible);

exports.Visible = Visible;
exports.Invisible = Invisible;

},{"./iq":33,"jxt":73}],52:[function(require,module,exports){
var WildEmitter = require('wildemitter');
var _ = require('../vendor/lodash');
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
        return (self.parser.parseFromString(data, 'application/xml')).childNodes[0];
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

    self.conn.onopen = function () {
        self.emit('connected', self);
    };

    self.conn.onclose = function () {
        self.emit('disconnected', self);
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

},{"../vendor/lodash":77,"./sm":20,"./stanza/iq":33,"./stanza/message":35,"./stanza/presence":37,"./stanza/stream":46,"async":53,"node-uuid":75,"wildemitter":76}],53:[function(require,module,exports){
(function(process){/*global setImmediate: false, setTimeout: false, console: false */
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

})(require("__browserify_process"))
},{"__browserify_process":65}],54:[function(require,module,exports){
(function(){// UTILITY
var util = require('util');
var Buffer = require("buffer").Buffer;
var pSlice = Array.prototype.slice;

function objectKeys(object) {
  if (Object.keys) return Object.keys(object);
  var result = [];
  for (var name in object) {
    if (Object.prototype.hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

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
  this.message = options.message;
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
};
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (value === undefined) {
    return '' + value;
  }
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (typeof value === 'function' || value instanceof RegExp) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (typeof s == 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

assert.AssertionError.prototype.toString = function() {
  if (this.message) {
    return [this.name + ':', this.message].join(' ');
  } else {
    return [
      this.name + ':',
      truncate(JSON.stringify(this.actual, replacer), 128),
      this.operator,
      truncate(JSON.stringify(this.expected, replacer), 128)
    ].join(' ');
  }
};

// assert.AssertionError instanceof Error

assert.AssertionError.__proto__ = Error.prototype;

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
// This statement is equivalent to assert.equal(true, guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!!!value) fail(value, true, message, '==', assert.ok);
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

  } else if (Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
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
    var ka = objectKeys(a),
        kb = objectKeys(b),
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

  if (expected instanceof RegExp) {
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

  if (typeof expected === 'string') {
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
    fail('Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail('Got unwanted exception' + message);
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
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

})()
},{"buffer":58,"util":56}],55:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
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
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
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

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":65}],56:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
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
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
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
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
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

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
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
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
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
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":55}],57:[function(require,module,exports){
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

},{}],58:[function(require,module,exports){
(function(){var assert = require('assert');
exports.Buffer = Buffer;
exports.SlowBuffer = Buffer;
Buffer.poolSize = 8192;
exports.INSPECT_MAX_BYTES = 50;

function Buffer(subject, encoding, offset) {
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }
  this.parent = this;
  this.offset = 0;

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    this.offset = offset;
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
Buffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

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

})()
},{"./buffer_ieee754":57,"assert":54,"base64-js":59}],59:[function(require,module,exports){
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

},{}],60:[function(require,module,exports){
(function(){var Buffer = require('buffer').Buffer
var sha = require('./sha')
var rng = require('./rng')
var md5 = require('./md5')

var algorithms = {
  sha1: {
    hex: sha.hex_sha1,
    binary: sha.b64_sha1,
    ascii: sha.str_sha1
  },
  md5: {
    hex: md5.hex_md5,
    binary: md5.b64_md5,
    ascii: md5.any_md5
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
, 'createHmac'
, 'createCypher'
, 'createCypheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDeffieHellman'
, 'pbkdf2'], function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

})()
},{"./md5":61,"./rng":62,"./sha":63,"buffer":58}],61:[function(require,module,exports){
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "";  /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_md5(s)    { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }
function b64_md5(s)    { return rstr2b64(rstr_md5(str2rstr_utf8(s))); }
function any_md5(s, e) { return rstr2any(rstr_md5(str2rstr_utf8(s)), e); }
function hex_hmac_md5(k, d)
  { return rstr2hex(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_md5(k, d)
  { return rstr2b64(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_md5(k, d, e)
  { return rstr2any(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of a raw string
 */
function rstr_md5(s)
{
  return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
}

/*
 * Calculate the HMAC-MD5, of a key and some data (raw strings)
 */
function rstr_hmac_md5(key, data)
{
  var bkey = rstr2binl(key);
  if(bkey.length > 16) bkey = binl_md5(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
  return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var i, j, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. All remainders are stored for later
   * use.
   */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)));
  var remainders = Array(full_length);
  for(j = 0; j < full_length; j++)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[j] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binl(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
  return output;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
  return output;
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
function binl_md5(x, len)
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


exports.hex_md5 = hex_md5;
exports.b64_md5 = b64_md5;
exports.any_md5 = any_md5;

},{}],62:[function(require,module,exports){
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

  // currently only available in webkit-based browsers.
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
},{}],63:[function(require,module,exports){
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
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */

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


},{}],64:[function(require,module,exports){
require=(function(e,t,n,r){function i(r){if(!n[r]){if(!t[r]){if(e)return e(r);throw new Error("Cannot find module '"+r+"'")}var s=n[r]={exports:{}};t[r][0](function(e){var n=t[r][1][e];return i(n?n:e)},s,s.exports)}return n[r].exports}for(var s=0;s<r.length;s++)i(r[s]);return i})(typeof require!=="undefined"&&require,{1:[function(require,module,exports){
// UTILITY
var util = require('util');
var Buffer = require("buffer").Buffer;
var pSlice = Array.prototype.slice;

function objectKeys(object) {
  if (Object.keys) return Object.keys(object);
  var result = [];
  for (var name in object) {
    if (Object.prototype.hasOwnProperty.call(object, name)) {
      result.push(name);
    }
  }
  return result;
}

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
  this.message = options.message;
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
};
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (value === undefined) {
    return '' + value;
  }
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (typeof value === 'function' || value instanceof RegExp) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (typeof s == 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

assert.AssertionError.prototype.toString = function() {
  if (this.message) {
    return [this.name + ':', this.message].join(' ');
  } else {
    return [
      this.name + ':',
      truncate(JSON.stringify(this.actual, replacer), 128),
      this.operator,
      truncate(JSON.stringify(this.expected, replacer), 128)
    ].join(' ');
  }
};

// assert.AssertionError instanceof Error

assert.AssertionError.__proto__ = Error.prototype;

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
// This statement is equivalent to assert.equal(true, guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!!!value) fail(value, true, message, '==', assert.ok);
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

  } else if (Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
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
    var ka = objectKeys(a),
        kb = objectKeys(b),
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

  if (expected instanceof RegExp) {
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

  if (typeof expected === 'string') {
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
    fail('Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail('Got unwanted exception' + message);
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
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

},{"util":2,"buffer":3}],2:[function(require,module,exports){
var events = require('events');

exports.isArray = isArray;
exports.isDate = function(obj){return Object.prototype.toString.call(obj) === '[object Date]'};
exports.isRegExp = function(obj){return Object.prototype.toString.call(obj) === '[object RegExp]'};


exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
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
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
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
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
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

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
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
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
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
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

},{"events":4}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
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
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
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

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(require("__browserify_process"))
},{"__browserify_process":6}],"buffer-browserify":[function(require,module,exports){
module.exports=require('q9TxCC');
},{}],"q9TxCC":[function(require,module,exports){
function SlowBuffer (size) {
    this.length = size;
};

var assert = require('assert');

exports.INSPECT_MAX_BYTES = 50;


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

SlowBuffer.byteLength = function (str, encoding) {
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

SlowBuffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

SlowBuffer.prototype.binaryWrite = SlowBuffer.prototype.asciiWrite;

SlowBuffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

SlowBuffer.prototype.utf8Slice = function () {
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

SlowBuffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

SlowBuffer.prototype.binarySlice = SlowBuffer.prototype.asciiSlice;

SlowBuffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<SlowBuffer ' + out.join(' ') + '>';
};


SlowBuffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


SlowBuffer.prototype.toString = function(encoding, start, end) {
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


SlowBuffer.prototype.hexWrite = function(string, offset, length) {
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
  SlowBuffer._charsWritten = i * 2;
  return i;
};


SlowBuffer.prototype.write = function(string, offset, length, encoding) {
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
SlowBuffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  return new Buffer(this, end - start, +start);
};

SlowBuffer.prototype.copy = function(target, targetstart, sourcestart, sourceend) {
  var temp = [];
  for (var i=sourcestart; i<sourceend; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=targetstart; i<targetstart+temp.length; i++) {
    target[i] = temp[i-targetstart];
  }
};

SlowBuffer.prototype.fill = function(value, start, end) {
  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  for (var i = start; i < end; i++) {
    this[i] = value;
  }
}

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}


// Buffer

function Buffer(subject, encoding, offset) {
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    this.parent = subject;
    this.offset = offset;
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

    if (this.length > Buffer.poolSize) {
      // Big buffer, just alloc one.
      this.parent = new SlowBuffer(this.length);
      this.offset = 0;

    } else {
      // Small buffer.
      if (!pool || pool.length - pool.used < this.length) allocPool();
      this.parent = pool;
      this.offset = pool.used;
      pool.used += this.length;
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        if (subject instanceof Buffer) {
          this.parent[i + this.offset] = subject.readUInt8(i);
        }
        else {
          this.parent[i + this.offset] = subject[i];
        }
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    }
  }

}

function isArrayIsh(subject) {
  return Array.isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

exports.SlowBuffer = SlowBuffer;
exports.Buffer = Buffer;

Buffer.poolSize = 8 * 1024;
var pool;

function allocPool() {
  pool = new SlowBuffer(Buffer.poolSize);
  pool.used = 0;
}


// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof SlowBuffer;
};

Buffer.concat = function (list, totalLength) {
  if (!Array.isArray(list)) {
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

// Inspect
Buffer.prototype.inspect = function inspect() {
  var out = [],
      len = this.length;

  for (var i = 0; i < len; i++) {
    out[i] = toHex(this.parent[i + this.offset]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }

  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i];
};


Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i] = v;
};


// write(string, offset = 0, length = buffer.length-offset, encoding = 'utf8')
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

  var ret;
  switch (encoding) {
    case 'hex':
      ret = this.parent.hexWrite(string, this.offset + offset, length);
      break;

    case 'utf8':
    case 'utf-8':
      ret = this.parent.utf8Write(string, this.offset + offset, length);
      break;

    case 'ascii':
      ret = this.parent.asciiWrite(string, this.offset + offset, length);
      break;

    case 'binary':
      ret = this.parent.binaryWrite(string, this.offset + offset, length);
      break;

    case 'base64':
      // Warning: maxLength not taken into account in base64Write
      ret = this.parent.base64Write(string, this.offset + offset, length);
      break;

    case 'ucs2':
    case 'ucs-2':
      ret = this.parent.ucs2Write(string, this.offset + offset, length);
      break;

    default:
      throw new Error('Unknown encoding');
  }

  Buffer._charsWritten = SlowBuffer._charsWritten;

  return ret;
};


// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();

  if (typeof start == 'undefined' || start < 0) {
    start = 0;
  } else if (start > this.length) {
    start = this.length;
  }

  if (typeof end == 'undefined' || end > this.length) {
    end = this.length;
  } else if (end < 0) {
    end = 0;
  }

  start = start + this.offset;
  end = end + this.offset;

  switch (encoding) {
    case 'hex':
      return this.parent.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.parent.utf8Slice(start, end);

    case 'ascii':
      return this.parent.asciiSlice(start, end);

    case 'binary':
      return this.parent.binarySlice(start, end);

    case 'base64':
      return this.parent.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.parent.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


// byteLength
Buffer.byteLength = SlowBuffer.byteLength;


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

  return this.parent.fill(value,
                          start + this.offset,
                          end + this.offset);
};


// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
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

  return this.parent.copy(target.parent,
                          target_start + target.offset,
                          start + this.offset,
                          end + this.offset);
};


// slice(start, end)
Buffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;
  if (end > this.length) throw new Error('oob');
  if (start > end) throw new Error('oob');

  return new Buffer(this.parent, end - start, +start + this.offset);
};


// Legacy methods for backwards compatibility.

Buffer.prototype.utf8Slice = function(start, end) {
  return this.toString('utf8', start, end);
};

Buffer.prototype.binarySlice = function(start, end) {
  return this.toString('binary', start, end);
};

Buffer.prototype.asciiSlice = function(start, end) {
  return this.toString('ascii', start, end);
};

Buffer.prototype.utf8Write = function(string, offset) {
  return this.write(string, offset, 'utf8');
};

Buffer.prototype.binaryWrite = function(string, offset) {
  return this.write(string, offset, 'binary');
};

Buffer.prototype.asciiWrite = function(string, offset) {
  return this.write(string, offset, 'ascii');
};

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (offset >= buffer.length) return;

  return buffer.parent[buffer.offset + offset];
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
    val = buffer.parent[buffer.offset + offset] << 8;
    if (offset + 1 < buffer.length) {
      val |= buffer.parent[buffer.offset + offset + 1];
    }
  } else {
    val = buffer.parent[buffer.offset + offset];
    if (offset + 1 < buffer.length) {
      val |= buffer.parent[buffer.offset + offset + 1] << 8;
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
      val = buffer.parent[buffer.offset + offset + 1] << 16;
    if (offset + 2 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 2] << 8;
    if (offset + 3 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 3];
    val = val + (buffer.parent[buffer.offset + offset] << 24 >>> 0);
  } else {
    if (offset + 2 < buffer.length)
      val = buffer.parent[buffer.offset + offset + 2] << 16;
    if (offset + 1 < buffer.length)
      val |= buffer.parent[buffer.offset + offset + 1] << 8;
    val |= buffer.parent[buffer.offset + offset];
    if (offset + 3 < buffer.length)
      val = val + (buffer.parent[buffer.offset + offset + 3] << 24 >>> 0);
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

  neg = buffer.parent[buffer.offset + offset] & 0x80;
  if (!neg) {
    return (buffer.parent[buffer.offset + offset]);
  }

  return ((0xff - buffer.parent[buffer.offset + offset] + 1) * -1);
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
    buffer.parent[buffer.offset + offset] = value;
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
    buffer.parent[buffer.offset + offset + i] =
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
    buffer.parent[buffer.offset + offset + i] =
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

SlowBuffer.prototype.readUInt8 = Buffer.prototype.readUInt8;
SlowBuffer.prototype.readUInt16LE = Buffer.prototype.readUInt16LE;
SlowBuffer.prototype.readUInt16BE = Buffer.prototype.readUInt16BE;
SlowBuffer.prototype.readUInt32LE = Buffer.prototype.readUInt32LE;
SlowBuffer.prototype.readUInt32BE = Buffer.prototype.readUInt32BE;
SlowBuffer.prototype.readInt8 = Buffer.prototype.readInt8;
SlowBuffer.prototype.readInt16LE = Buffer.prototype.readInt16LE;
SlowBuffer.prototype.readInt16BE = Buffer.prototype.readInt16BE;
SlowBuffer.prototype.readInt32LE = Buffer.prototype.readInt32LE;
SlowBuffer.prototype.readInt32BE = Buffer.prototype.readInt32BE;
SlowBuffer.prototype.readFloatLE = Buffer.prototype.readFloatLE;
SlowBuffer.prototype.readFloatBE = Buffer.prototype.readFloatBE;
SlowBuffer.prototype.readDoubleLE = Buffer.prototype.readDoubleLE;
SlowBuffer.prototype.readDoubleBE = Buffer.prototype.readDoubleBE;
SlowBuffer.prototype.writeUInt8 = Buffer.prototype.writeUInt8;
SlowBuffer.prototype.writeUInt16LE = Buffer.prototype.writeUInt16LE;
SlowBuffer.prototype.writeUInt16BE = Buffer.prototype.writeUInt16BE;
SlowBuffer.prototype.writeUInt32LE = Buffer.prototype.writeUInt32LE;
SlowBuffer.prototype.writeUInt32BE = Buffer.prototype.writeUInt32BE;
SlowBuffer.prototype.writeInt8 = Buffer.prototype.writeInt8;
SlowBuffer.prototype.writeInt16LE = Buffer.prototype.writeInt16LE;
SlowBuffer.prototype.writeInt16BE = Buffer.prototype.writeInt16BE;
SlowBuffer.prototype.writeInt32LE = Buffer.prototype.writeInt32LE;
SlowBuffer.prototype.writeInt32BE = Buffer.prototype.writeInt32BE;
SlowBuffer.prototype.writeFloatLE = Buffer.prototype.writeFloatLE;
SlowBuffer.prototype.writeFloatBE = Buffer.prototype.writeFloatBE;
SlowBuffer.prototype.writeDoubleLE = Buffer.prototype.writeDoubleLE;
SlowBuffer.prototype.writeDoubleBE = Buffer.prototype.writeDoubleBE;

},{"assert":1,"./buffer_ieee754":5,"base64-js":7}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
function SlowBuffer (size) {
    this.length = size;
};

var assert = require('assert');

exports.INSPECT_MAX_BYTES = 50;


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

SlowBuffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

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

SlowBuffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

SlowBuffer.prototype.utf8Slice = function () {
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

SlowBuffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

SlowBuffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<SlowBuffer ' + out.join(' ') + '>';
};


SlowBuffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


SlowBuffer.prototype.toString = function(encoding, start, end) {
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


SlowBuffer.prototype.hexWrite = function(string, offset, length) {
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
  SlowBuffer._charsWritten = i * 2;
  return i;
};


SlowBuffer.prototype.write = function(string, offset, length, encoding) {
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
SlowBuffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  return new Buffer(this, end - start, +start);
};

SlowBuffer.prototype.copy = function(target, targetstart, sourcestart, sourceend) {
  var temp = [];
  for (var i=sourcestart; i<sourceend; i++) {
    assert.ok(typeof this[i] !== 'undefined', "copying undefined buffer bytes!");
    temp.push(this[i]);
  }

  for (var i=targetstart; i<targetstart+temp.length; i++) {
    target[i] = temp[i-targetstart];
  }
};

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}


// Buffer

function Buffer(subject, encoding, offset) {
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    this.parent = subject;
    this.offset = offset;
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

    if (this.length > Buffer.poolSize) {
      // Big buffer, just alloc one.
      this.parent = new SlowBuffer(this.length);
      this.offset = 0;

    } else {
      // Small buffer.
      if (!pool || pool.length - pool.used < this.length) allocPool();
      this.parent = pool;
      this.offset = pool.used;
      pool.used += this.length;
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        this.parent[i + this.offset] = subject[i];
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    }
  }

}

function isArrayIsh(subject) {
  return Array.isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

exports.SlowBuffer = SlowBuffer;
exports.Buffer = Buffer;

Buffer.poolSize = 8 * 1024;
var pool;

function allocPool() {
  pool = new SlowBuffer(Buffer.poolSize);
  pool.used = 0;
}


// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof SlowBuffer;
};

Buffer.concat = function (list, totalLength) {
  if (!Array.isArray(list)) {
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

// Inspect
Buffer.prototype.inspect = function inspect() {
  var out = [],
      len = this.length;

  for (var i = 0; i < len; i++) {
    out[i] = toHex(this.parent[i + this.offset]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }

  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i];
};


Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i] = v;
};


// write(string, offset = 0, length = buffer.length-offset, encoding = 'utf8')
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

  var ret;
  switch (encoding) {
    case 'hex':
      ret = this.parent.hexWrite(string, this.offset + offset, length);
      break;

    case 'utf8':
    case 'utf-8':
      ret = this.parent.utf8Write(string, this.offset + offset, length);
      break;

    case 'ascii':
      ret = this.parent.asciiWrite(string, this.offset + offset, length);
      break;

    case 'binary':
      ret = this.parent.binaryWrite(string, this.offset + offset, length);
      break;

    case 'base64':
      // Warning: maxLength not taken into account in base64Write
      ret = this.parent.base64Write(string, this.offset + offset, length);
      break;

    case 'ucs2':
    case 'ucs-2':
      ret = this.parent.ucs2Write(string, this.offset + offset, length);
      break;

    default:
      throw new Error('Unknown encoding');
  }

  Buffer._charsWritten = SlowBuffer._charsWritten;

  return ret;
};


// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();

  if (typeof start == 'undefined' || start < 0) {
    start = 0;
  } else if (start > this.length) {
    start = this.length;
  }

  if (typeof end == 'undefined' || end > this.length) {
    end = this.length;
  } else if (end < 0) {
    end = 0;
  }

  start = start + this.offset;
  end = end + this.offset;

  switch (encoding) {
    case 'hex':
      return this.parent.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.parent.utf8Slice(start, end);

    case 'ascii':
      return this.parent.asciiSlice(start, end);

    case 'binary':
      return this.parent.binarySlice(start, end);

    case 'base64':
      return this.parent.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.parent.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


// byteLength
Buffer.byteLength = SlowBuffer.byteLength;


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

  return this.parent.fill(value,
                          start + this.offset,
                          end + this.offset);
};


// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
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

  return this.parent.copy(target.parent,
                          target_start + target.offset,
                          start + this.offset,
                          end + this.offset);
};


// slice(start, end)
Buffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;
  if (end > this.length) throw new Error('oob');
  if (start > end) throw new Error('oob');

  return new Buffer(this.parent, end - start, +start + this.offset);
};


// Legacy methods for backwards compatibility.

Buffer.prototype.utf8Slice = function(start, end) {
  return this.toString('utf8', start, end);
};

Buffer.prototype.binarySlice = function(start, end) {
  return this.toString('binary', start, end);
};

Buffer.prototype.asciiSlice = function(start, end) {
  return this.toString('ascii', start, end);
};

Buffer.prototype.utf8Write = function(string, offset) {
  return this.write(string, offset, 'utf8');
};

Buffer.prototype.binaryWrite = function(string, offset) {
  return this.write(string, offset, 'binary');
};

Buffer.prototype.asciiWrite = function(string, offset) {
  return this.write(string, offset, 'ascii');
};

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  return buffer.parent[buffer.offset + offset];
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

  if (isBigEndian) {
    val = buffer.parent[buffer.offset + offset] << 8;
    val |= buffer.parent[buffer.offset + offset + 1];
  } else {
    val = buffer.parent[buffer.offset + offset];
    val |= buffer.parent[buffer.offset + offset + 1] << 8;
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

  if (isBigEndian) {
    val = buffer.parent[buffer.offset + offset + 1] << 16;
    val |= buffer.parent[buffer.offset + offset + 2] << 8;
    val |= buffer.parent[buffer.offset + offset + 3];
    val = val + (buffer.parent[buffer.offset + offset] << 24 >>> 0);
  } else {
    val = buffer.parent[buffer.offset + offset + 2] << 16;
    val |= buffer.parent[buffer.offset + offset + 1] << 8;
    val |= buffer.parent[buffer.offset + offset];
    val = val + (buffer.parent[buffer.offset + offset + 3] << 24 >>> 0);
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

  neg = buffer.parent[buffer.offset + offset] & 0x80;
  if (!neg) {
    return (buffer.parent[buffer.offset + offset]);
  }

  return ((0xff - buffer.parent[buffer.offset + offset] + 1) * -1);
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

  buffer.parent[buffer.offset + offset] = value;
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

  if (isBigEndian) {
    buffer.parent[buffer.offset + offset] = (value & 0xff00) >>> 8;
    buffer.parent[buffer.offset + offset + 1] = value & 0x00ff;
  } else {
    buffer.parent[buffer.offset + offset + 1] = (value & 0xff00) >>> 8;
    buffer.parent[buffer.offset + offset] = value & 0x00ff;
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

  if (isBigEndian) {
    buffer.parent[buffer.offset + offset] = (value >>> 24) & 0xff;
    buffer.parent[buffer.offset + offset + 1] = (value >>> 16) & 0xff;
    buffer.parent[buffer.offset + offset + 2] = (value >>> 8) & 0xff;
    buffer.parent[buffer.offset + offset + 3] = value & 0xff;
  } else {
    buffer.parent[buffer.offset + offset + 3] = (value >>> 24) & 0xff;
    buffer.parent[buffer.offset + offset + 2] = (value >>> 16) & 0xff;
    buffer.parent[buffer.offset + offset + 1] = (value >>> 8) & 0xff;
    buffer.parent[buffer.offset + offset] = value & 0xff;
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

SlowBuffer.prototype.readUInt8 = Buffer.prototype.readUInt8;
SlowBuffer.prototype.readUInt16LE = Buffer.prototype.readUInt16LE;
SlowBuffer.prototype.readUInt16BE = Buffer.prototype.readUInt16BE;
SlowBuffer.prototype.readUInt32LE = Buffer.prototype.readUInt32LE;
SlowBuffer.prototype.readUInt32BE = Buffer.prototype.readUInt32BE;
SlowBuffer.prototype.readInt8 = Buffer.prototype.readInt8;
SlowBuffer.prototype.readInt16LE = Buffer.prototype.readInt16LE;
SlowBuffer.prototype.readInt16BE = Buffer.prototype.readInt16BE;
SlowBuffer.prototype.readInt32LE = Buffer.prototype.readInt32LE;
SlowBuffer.prototype.readInt32BE = Buffer.prototype.readInt32BE;
SlowBuffer.prototype.readFloatLE = Buffer.prototype.readFloatLE;
SlowBuffer.prototype.readFloatBE = Buffer.prototype.readFloatBE;
SlowBuffer.prototype.readDoubleLE = Buffer.prototype.readDoubleLE;
SlowBuffer.prototype.readDoubleBE = Buffer.prototype.readDoubleBE;
SlowBuffer.prototype.writeUInt8 = Buffer.prototype.writeUInt8;
SlowBuffer.prototype.writeUInt16LE = Buffer.prototype.writeUInt16LE;
SlowBuffer.prototype.writeUInt16BE = Buffer.prototype.writeUInt16BE;
SlowBuffer.prototype.writeUInt32LE = Buffer.prototype.writeUInt32LE;
SlowBuffer.prototype.writeUInt32BE = Buffer.prototype.writeUInt32BE;
SlowBuffer.prototype.writeInt8 = Buffer.prototype.writeInt8;
SlowBuffer.prototype.writeInt16LE = Buffer.prototype.writeInt16LE;
SlowBuffer.prototype.writeInt16BE = Buffer.prototype.writeInt16BE;
SlowBuffer.prototype.writeInt32LE = Buffer.prototype.writeInt32LE;
SlowBuffer.prototype.writeInt32BE = Buffer.prototype.writeInt32BE;
SlowBuffer.prototype.writeFloatLE = Buffer.prototype.writeFloatLE;
SlowBuffer.prototype.writeFloatBE = Buffer.prototype.writeFloatBE;
SlowBuffer.prototype.writeDoubleLE = Buffer.prototype.writeDoubleLE;
SlowBuffer.prototype.writeDoubleBE = Buffer.prototype.writeDoubleBE;

},{"assert":1,"./buffer_ieee754":8,"base64-js":9}],9:[function(require,module,exports){
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

},{}]},{},[])
;;module.exports=require("buffer-browserify")

},{}],65:[function(require,module,exports){
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

},{}],66:[function(require,module,exports){
var _ = require('./vendor/lodash');
var async = require('async');
var jxt = require('jxt');
var request = require('xhr');
var parser = new DOMParser();


function XRD(data, xml) {
    return jxt.init(this, xml, data);
}
XRD.prototype = {
    constructor: {
        value: XRD
    },
    NS: 'http://docs.oasis-open.org/ns/xri/xrd-1.0',
    EL: 'XRD',
    toString: jxt.toString,
    toJSON: jxt.toJSON,
    get subject() {
        return jxt.getSubText(this.xml, this.NS, 'Subject');
    },
    get expires() {
        return new Date(jxt.getSubText(this.xml, this.NS, 'Expires'));
    },
    get aliases() {
        return jxt.getMultiSubText(this.xml, this.NS, 'Alias');
    },
    get properties() {
        var results = {};
        var props = jxt.find(this.xml, this.NS, 'Property');
        _.each(props, function (property) {
            var type = jxt.getAttribute(property, 'type');
            results[type] = property.textContent;
        });
        return results;
    },
    get links() {
        var results = [];
        var links = jxt.find(this.xml, this.NS, 'Link');
        _.each(links, function (link) {
            var item = {
                rel: jxt.getAttribute(link, 'rel'),
                href: jxt.getAttribute(link, 'href'),
                type: jxt.getAttribute(link, 'type'),
                template: jxt.getAttribute(link, 'template'),
                titles: jxt.getSubLangText(link, this.NS, 'Title', 'default'),
                properties: {}
            };
            var props = jxt.find(link, this.NS, 'Property');
            _.each(props, function (property) {
                var type = jxt.getAttribute(property, 'type');
                item.properties[type] = property.textContent;
            });
            results.push(item);
        });
        return results;
    }
};


module.exports = function (opts, cb) {
    if (typeof opts === 'string') {
        opts = {host: opts};
    }

    opts = _.extend({
        ssl: true,
        json: true
    }, opts);

    var scheme = opts.ssl ? 'https://' : 'http://';

    async.parallel({
        json: function (jsonCb) {
            if (!opts.json) return jsonCb(null, {});
            request({
                uri: scheme + opts.host + '/.well-known/host-meta.json'
            }, function (err, resp, body) {
                if (err) return jsonCb();
                try {
                    jsonCb('completed', JSON.parse(body));
                } catch (e) {
                    jsonCb(null, {});
                }
            });
        },
        xrd: function (xrdCb) {
            request({
                uri: scheme + opts.host + '/.well-known/host-meta'
            }, function (err, resp) {
                if (err) return xrdCb(null, {});
                try {
                    var body = parser.parseFromString(resp.body, 'application/xml').childNodes[0];
                    var xrd = new XRD({}, body);
                    xrdCb('completed', xrd.toJSON());
                } catch (e) {
                    xrdCb(null, {});
                }
            });
        }
    }, function (completed, data) {
        if (completed) {
            if (Object.keys(data.json).length) {
                return cb(false, data.json);
            } else if (Object.keys(data.xrd).length) {
                return cb(false, data.xrd);
            }
        }
        cb('no-host-meta', {});
    });
};

},{"./vendor/lodash":72,"async":53,"jxt":67,"xhr":69}],67:[function(require,module,exports){
var _ = require('./vendor/lodash');
var serializer = new XMLSerializer();
var XML_NS = 'http://www.w3.org/XML/1998/namespace';
var TOP_LEVEL_LOOKUP = {};
var LOOKUP = {};
var LOOKUP_EXT = {};


var find = exports.find = function (xml, NS, selector) {
    var children = xml.querySelectorAll(selector);
    return _.filter(children, function (child) {
        return child.namespaceURI === NS && child.parentNode == xml;
    });
};

exports.findOrCreate = function (xml, NS, selector) {
    var existing = find(xml, NS, selector);
    if (existing.length) {
        return existing[0];
    } else {
        var created = document.createElementNS(NS, selector);
        xml.appendChild(created);
        return created;
    }
};

exports.init = function (self, xml, data) {
    self.xml = xml || document.createElementNS(self.NS, self.EL);
    if (!self.xml.parentNode || self.xml.parentNode.namespaceURI !== self.NS) {
        self.xml.setAttribute('xmlns', self.NS);
    }

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
    return self;
};

exports.getSubText = function (xml, NS, element) {
    var subs = find(xml, NS, element);
    if (!subs) {
        return '';
    }

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].namespaceURI === NS) {
            return subs[i].textContent || '';
        }
    }
    
    return '';
};

exports.getMultiSubText = function (xml, NS, element, extractor) {
    var subs = find(xml, NS, element);
    var results = [];
    extractor = extractor || function (sub) {
        return sub.textContent || '';
    };

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].namespaceURI === NS) {
            results.push(extractor(subs[i]));
        }
    }
    
    return results;
};

exports.getSubLangText = function (xml, NS, element, defaultLang) {
    var subs = find(xml, NS, element);
    if (!subs) {
        return {};
    }

    var lang, sub;
    var results = {};
    var langs = [];

    for (var i = 0; i < subs.length; i++) {
        sub = subs[i];
        if (sub.namespaceURI === NS) {
            lang = sub.getAttributeNS(XML_NS, 'lang') || defaultLang;
            langs.push(lang);
            results[lang] = sub.textContent || '';
        }
    }
    
    return results;
};


exports.setSubText = function (xml, NS, element, value) {
    var subs = find(xml, NS, element);
    if (!subs.length) {
        if (value) {
            var sub = document.createElementNS(NS, element);
            sub.textContent = value;
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].namespaceURI === NS) {
                if (value) {
                    subs[i].textContent = value;
                    return;
                } else {
                    xml.removeChild(subs[i]);
                }
            }
        }
    }
};

exports.setMultiSubText = function (xml, NS, element, value, builder) {
    var subs = find(xml, NS, element);
    var values = [];
    builder = builder || function (value) {
        var sub = document.createElementNS(NS, element);
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

exports.setSubLangText = function (xml, NS, element, value, defaultLang) {
    var sub, lang;
    var subs = find(xml, NS, element);
    if (subs.length) {
        for (var i = 0; i < subs.length; i++) {
            sub = subs[i];
            if (sub.namespaceURI === NS) {
                xml.removeChild(sub);
            }
        }
    }

    if (typeof value === 'string') {
        sub = document.createElementNS(NS, element);
        sub.textContent = value;
        xml.appendChild(sub);
    } else if (typeof value === 'object') {
        for (lang in value) {
            if (value.hasOwnProperty(lang)) {
                sub = document.createElementNS(NS, element);
                if (lang !== defaultLang) {
                    sub.setAttributeNS(XML_NS, 'lang', lang);
                }
                sub.textContent = value[lang];
                xml.appendChild(sub);
            }
        }
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
        if (subs[i].namespaceURI === NS) {
            return subs[i].getAttribute(attr) || defaultVal || '';
        }
    }
    
    return '';
};

exports.setSubAttribute = function (xml, NS, sub, attr, value) {
    var subs = find(xml, NS, sub);
    if (!subs.length) {
        if (value) {
            sub = document.createElementNS(NS, sub);
            sub.setAttribute(attr, value);
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].namespaceURI === NS) {
                if (value) {
                    subs[i].setAttribute(attr, value);
                    return;
                } else {
                    subs[i].removeAttribute(attr);
                }
            }
        }
    }
};

exports.toString = function () {
    return serializer.serializeToString(this.xml);
};

exports.toJSON = function () {
    var prop;
    var result = {};
    var exclude = {
        constructor: true,
        NS: true,
        EL: true,
        toString: true,
        toJSON: true,
        _extensions: true,
        prototype: true,
        xml: true,
        parent: true,
        _name: true
    };
    for (prop in this._extensions) {
        if (this._extensions[prop].toJSON) {
            result[prop] = this._extensions[prop].toJSON();
        }
    }
    for (prop in this) {
        if (!exclude[prop] && !((LOOKUP_EXT[this.NS + '|' + this.EL] || {})[prop]) && !this._extensions[prop] && prop[0] !== '_') {
            var val = this[prop];
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
};

exports.extend = function (ParentJXT, ChildJXT) {
    var parentName = ParentJXT.prototype.NS + '|' + ParentJXT.prototype.EL;
    var name = ChildJXT.prototype._name;
    var qName = ChildJXT.prototype.NS + '|' + ChildJXT.prototype.EL;

    LOOKUP[qName] = ChildJXT;
    if (!LOOKUP_EXT[qName]) {
        LOOKUP_EXT[qName] = {};
    }
    if (!LOOKUP_EXT[parentName]) {
        LOOKUP_EXT[parentName] = {};
    }
    LOOKUP_EXT[parentName][name] = ChildJXT;

    ParentJXT.prototype.__defineGetter__(name, function () {
        if (!this._extensions[name]) {
            var existing = exports.find(this.xml, ChildJXT.prototype.NS, ChildJXT.prototype.EL);
            if (!existing.length) {
                this._extensions[name] = new ChildJXT();
                this.xml.appendChild(this._extensions[name].xml);
            } else {
                this._extensions[name] = new ChildJXT(null, existing[0]);
            }
            this._extensions[name].parent = this;
        }
        return this._extensions[name];
    });
    ParentJXT.prototype.__defineSetter__(name, function (value) {
        var child = this[name];
        _.extend(child, value);
    });
};

exports.topLevel = function (JXT) {
    var name = JXT.prototype.NS + '|' + JXT.prototype.EL;
    LOOKUP[name] = JXT;
    TOP_LEVEL_LOOKUP[name] = JXT;
};

exports.build = function (xml) {
    var JXT = TOP_LEVEL_LOOKUP[xml.namespaceURI + '|' + xml.localName];
    if (JXT) {
        return new JXT(null, xml);
    }
};

exports.XML_NS = XML_NS;
exports.TOP_LEVEL_LOOKUP = TOP_LEVEL_LOOKUP;
exports.LOOKUP_EXT = LOOKUP_EXT;
exports.LOOKUP = LOOKUP;

},{"./vendor/lodash":68}],68:[function(require,module,exports){
(function(global){/**
 * @license
 * Lo-Dash 1.3.1 (Custom Build) lodash.com/license
 * Build: `lodash include="each,extend,filter"`
 * Underscore.js 1.4.4 underscorejs.org/LICENSE
 */
;!function(t){function r(t){return typeof t.toString!="function"&&typeof(t+"")=="string"}function e(t){t.length=0,g.length<y&&g.push(t)}function n(t){var r=t.k;r&&n(r),t.b=t.k=t.object=t.number=t.string=null,h.length<y&&h.push(t)}function o(){}function u(){var t=h.pop()||{a:"",b:null,c:"",k:null,"false":!1,d:"",e:"",f:"","null":!1,number:null,object:null,push:null,g:null,string:null,h:"","true":!1,undefined:!1,i:!1,j:!1};t.g=v,t.b=t.c=t.f=t.h="",t.e="r",t.i=!0,t.j=!!X;for(var r,e=0;r=arguments[e];e++)for(var u in r)t[u]=r[u];
e=t.a,t.d=/^[^,]+/.exec(e)[0],r=Function,e="return function("+e+"){",u="var m,r="+t.d+",C="+t.e+";if(!r)return C;"+t.h+";",t.b?(u+="var s=r.length;m=-1;if("+t.b+"){",K.unindexedChars&&(u+="if(q(r)){r=r.split('')}"),u+="while(++m<s){"+t.f+";}}else{"):K.nonEnumArgs&&(u+="var s=r.length;m=-1;if(s&&n(r)){while(++m<s){m+='';"+t.f+";}}else{"),K.enumPrototypes&&(u+="var E=typeof r=='function';"),K.enumErrorProps&&(u+="var D=r===j||r instanceof Error;");var c=[];if(K.enumPrototypes&&c.push('!(E&&m=="prototype")'),K.enumErrorProps&&c.push('!(D&&(m=="message"||m=="name"))'),t.i&&t.j)u+="var A=-1,B=z[typeof r]&&t(r),s=B?B.length:0;while(++A<s){m=B[A];",c.length&&(u+="if("+c.join("&&")+"){"),u+=t.f+";",c.length&&(u+="}"),u+="}";
else if(u+="for(m in r){",t.i&&c.push("l.call(r, m)"),c.length&&(u+="if("+c.join("&&")+"){"),u+=t.f+";",c.length&&(u+="}"),u+="}",K.nonEnumShadows){for(u+="if(r!==y){var h=r.constructor,p=r===(h&&h.prototype),e=r===H?G:r===j?i:J.call(r),v=w[e];",k=0;7>k;k++)u+="m='"+t.g[k]+"';if((!(p&&v[m])&&l.call(r,m))",t.i||(u+="||(!v[m]&&r[m]!==y[m])"),u+="){"+t.f+"}";u+="}"}return(t.b||K.nonEnumArgs)&&(u+="}"),u+=t.c+";return C",r=r("i,j,l,n,o,q,t,u,y,z,w,G,H,J",e+u+"}"),n(t),r(_,z,R,a,U,l,X,o,D,P,V,A,N,M)}function a(t){return M.call(t)==j
}function c(t,n,u,i,l,s){var p=u===b;if(typeof u=="function"&&!p){u=o.createCallback(u,i,2);var m=u(t,n);if(typeof m!="undefined")return!!m}if(t===n)return 0!==t||1/t==1/n;var h=typeof t,y=typeof n;if(t===t&&(!t||"function"!=h&&"object"!=h)&&(!n||"function"!=y&&"object"!=y))return!1;if(null==t||null==n)return t===n;if(y=M.call(t),h=M.call(n),y==j&&(y=w),h==j&&(h=w),y!=h)return!1;switch(y){case O:case E:return+t==+n;case x:return t!=+t?n!=+n:0==t?1/t==1/n:t==+n;case S:case A:return t==n+""}if(h=y==C,!h){if(R.call(t,"__wrapped__")||R.call(n,"__wrapped__"))return c(t.__wrapped__||t,n.__wrapped__||n,u,i,l,s);
if(y!=w||!K.nodeClass&&(r(t)||r(n)))return!1;var y=!K.argsObject&&a(t)?Object:t.constructor,d=!K.argsObject&&a(n)?Object:n.constructor;if(y!=d&&(!f(y)||!(y instanceof y&&f(d)&&d instanceof d)))return!1}for(d=!l,l||(l=g.pop()||[]),s||(s=g.pop()||[]),y=l.length;y--;)if(l[y]==t)return s[y]==n;var v=0,m=!0;if(l.push(t),s.push(n),h){if(y=t.length,v=n.length,m=v==t.length,!m&&!p)return m;for(;v--;)if(h=y,d=n[v],p)for(;h--&&!(m=c(t[h],d,u,i,l,s)););else if(!(m=c(t[v],d,u,i,l,s)))break;return m}return Z(n,function(r,e,n){return R.call(n,e)?(v++,m=R.call(t,e)&&c(t[e],r,u,i,l,s)):void 0
}),m&&!p&&Z(t,function(t,r,e){return R.call(e,r)?m=-1<--v:void 0}),d&&(e(l),e(s)),m}function f(t){return typeof t=="function"}function i(t){return!(!t||!P[typeof t])}function l(t){return typeof t=="string"||M.call(t)==A}function s(t,r,e){var n=[];if(r=o.createCallback(r,e),U(t)){e=-1;for(var u=t.length;++e<u;){var a=t[e];r(a,e,t)&&n.push(a)}}else Y(t,function(t,e,o){r(t,e,o)&&n.push(t)});return n}function p(t,r,e){if(r&&typeof e=="undefined"&&U(t)){e=-1;for(var n=t.length;++e<n&&false!==r(t[e],e,t););}else Y(t,r,e);
return t}function m(t){return t}var g=[],h=[],b={},y=40,d=(d=/\bthis\b/)&&d.test(function(){return this})&&d,v="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),j="[object Arguments]",C="[object Array]",O="[object Boolean]",E="[object Date]",_="[object Error]",x="[object Number]",w="[object Object]",S="[object RegExp]",A="[object String]",P={"boolean":!1,"function":!0,object:!0,number:!1,string:!1,undefined:!1},I=P[typeof exports]&&exports,B=P[typeof module]&&module&&module.exports==I&&module,F=P[typeof global]&&global;
!F||F.global!==F&&F.window!==F||(t=F);var z=Error.prototype,D=Object.prototype,N=String.prototype,F=RegExp("^"+(D.valueOf+"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/valueOf|for [^\]]+/g,".+?")+"$"),q=Function.prototype.toString,R=D.hasOwnProperty,$=D.propertyIsEnumerable,M=D.toString,T=F.test(T=M.bind)&&T,G=F.test(G=Object.create)&&G,H=F.test(H=Array.isArray)&&H,J=F.test(J=Object.keys)&&J,G=F.test(t.attachEvent),L=T&&!/\n|true/.test(T+G),V={};V[C]=V[E]=V[x]={constructor:!0,toLocaleString:!0,toString:!0,valueOf:!0},V[O]=V[A]={constructor:!0,toString:!0,valueOf:!0},V[_]=V["[object Function]"]=V[S]={constructor:!0,toString:!0},V[w]={constructor:!0},function(){for(var t=v.length;t--;){var r,e=v[t];
for(r in V)R.call(V,r)&&!R.call(V[r],e)&&(V[r][e]=!1)}}();var K=o.support={};!function(){var t=function(){this.x=1},r=[];t.prototype={valueOf:1,y:1};for(var e in new t)r.push(e);for(e in arguments);K.argsObject=arguments.constructor==Object&&!(arguments instanceof Array),K.argsClass=a(arguments),K.enumErrorProps=$.call(z,"message")||$.call(z,"name"),K.enumPrototypes=$.call(t,"prototype"),K.fastBind=T&&!L,K.nonEnumArgs=0!=e,K.nonEnumShadows=!/valueOf/.test(r),K.unindexedChars="xx"!="x"[0]+Object("x")[0];
try{K.nodeClass=!(M.call(document)==w&&!({toString:0}+""))}catch(n){K.nodeClass=!0}}(1);var Q={a:"x,F,k",h:"var a=arguments,b=0,c=typeof k=='number'?2:a.length;while(++b<c){r=a[b];if(r&&z[typeof r]){",f:"if(typeof C[m]=='undefined')C[m]=r[m]",c:"}}"},G={a:"f,d,I",h:"d=d&&typeof I=='undefined'?d:u.createCallback(d,I)",b:"typeof s=='number'",f:"if(d(r[m],m,f)===false)return C"},F={h:"if(!z[typeof r])return C;"+G.h,b:!1};K.argsClass||(a=function(t){return t?R.call(t,"callee"):!1});var U=H||function(t){return t?typeof t=="object"&&M.call(t)==C:!1
},W=u({a:"x",e:"[]",h:"if(!(z[typeof x]))return C",f:"C.push(m)"}),X=J?function(t){return i(t)?K.enumPrototypes&&typeof t=="function"||K.nonEnumArgs&&t.length&&a(t)?W(t):J(t):[]}:W,Y=u(G),H=u(Q,{h:Q.h.replace(";",";if(c>3&&typeof a[c-2]=='function'){var d=u.createCallback(a[--c-1],a[c--],2)}else if(c>2&&typeof a[c-1]=='function'){d=a[--c]}"),f:"C[m]=d?d(C[m],r[m]):r[m]"}),Z=u(G,F,{i:!1});f(/x/)&&(f=function(t){return typeof t=="function"&&"[object Function]"==M.call(t)}),o.assign=H,o.createCallback=function(t,r,e){if(null==t)return m;
var n=typeof t;if("function"!=n){if("object"!=n)return function(r){return r[t]};var o=X(t);return function(r){for(var e=o.length,n=!1;e--&&(n=c(r[o[e]],t[o[e]],b)););return n}}return typeof r=="undefined"||d&&!d.test(q.call(t))?t:1===e?function(e){return t.call(r,e)}:2===e?function(e,n){return t.call(r,e,n)}:4===e?function(e,n,o,u){return t.call(r,e,n,o,u)}:function(e,n,o){return t.call(r,e,n,o)}},o.filter=s,o.forEach=p,o.forIn=Z,o.keys=X,o.each=p,o.extend=H,o.select=s,o.identity=m,o.isArguments=a,o.isArray=U,o.isEqual=c,o.isFunction=f,o.isObject=i,o.isString=l,o.VERSION="1.3.1",typeof define=="function"&&typeof define.amd=="object"&&define.amd?(t._=o, define(function(){return o
})):I&&!I.nodeType?B?(B.exports=o)._=o:I._=o:t._=o}(this);
})(self)
},{}],69:[function(require,module,exports){
(function(){var window = require("global/window")
var once = require("once")

var messages = {
    "0": "Internal XMLHttpRequest Error",
    "4": "4xx Client Error",
    "5": "5xx Server Error"
}

var XHR = window.XMLHttpRequest || noop
var XDR = "withCredentials" in (new XHR()) ?
        window.XMLHttpRequest : window.XDomainRequest

module.exports = createXHR

function createXHR(options, callback) {
    if (typeof options === "string") {
        options = { uri: options }
    }

    options = options || {}
    callback = once(callback)

    var xhr

    if (options.cors) {
        xhr = new XDR()
        xhr.withCredentials = true
    } else {
        xhr = new XHR()
    }

    var uri = xhr.url = options.uri
    var method = xhr.method = options.method || "GET"
    var body = options.body || options.data
    var headers = xhr.headers = options.headers || {}
    var isJson = false

    if ("json" in options) {
        isJson = true
        headers["Content-Type"] = "application/json"
        body = JSON.stringify(options.json)
    }

    xhr.onreadystatechange = readystatechange
    xhr.onload = load
    xhr.onerror = error
    // IE9 must have onprogress be set to a unique function.
    xhr.onprogress = function () {
        // IE must die
    }
    // hate IE
    xhr.ontimeout = noop
    xhr.open(method, uri)
    xhr.timeout = "timeout" in options ? options.timeout : 5000

    if ( xhr.setRequestHeader) {
        Object.keys(headers).forEach(function (key) {
            xhr.setRequestHeader(key, headers[key])
        })
    }

    xhr.send(body)

    return xhr

    function readystatechange() {
        if (xhr.readyState === 4) {
            load()
        }
    }

    function load() {
        var error = null
        var status = xhr.statusCode = xhr.status
        var body = xhr.body = xhr.response ||
            xhr.responseText || xhr.responseXML

        if (status === 0 || (status >= 400 && status < 600)) {
            var message = xhr.responseText ||
                messages[String(xhr.status).charAt(0)]
            error = new Error(message)

            error.statusCode = xhr.status
        }

        if (isJson) {
            try {
                body = xhr.body = JSON.parse(body)
            } catch (e) {}
        }

        callback(error, xhr, body)
    }

    function error(evt) {
        callback(evt, xhr)
    }
}


function noop() {}

})()
},{"global/window":70,"once":71}],70:[function(require,module,exports){
(function(global){if (typeof window !== "undefined") {
    module.exports = window
} else if (typeof global !== "undefined") {
    module.exports = global
} else {
    module.exports = {}
}

})(self)
},{}],71:[function(require,module,exports){
module.exports = once

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var called = false
  return function () {
    if (called) return
    called = true
    return fn.apply(this, arguments)
  }
}

},{}],72:[function(require,module,exports){
(function(global){/**
 * @license
 * Lo-Dash 1.3.1 (Custom Build) lodash.com/license
 * Build: `lodash include="each,extend"`
 * Underscore.js 1.4.4 underscorejs.org/LICENSE
 */
;!function(t){function r(t){return typeof t.toString!="function"&&typeof(t+"")=="string"}function e(t){t.length=0,m.length<y&&m.push(t)}function n(t){var r=t.k;r&&n(r),t.b=t.k=t.object=t.number=t.string=null,g.length<y&&g.push(t)}function o(){}function u(){var t=g.pop()||{a:"",b:null,c:"",k:null,"false":!1,d:"",e:"",f:"","null":!1,number:null,object:null,push:null,g:null,string:null,h:"","true":!1,undefined:!1,i:!1,j:!1};t.g=d,t.b=t.c=t.f=t.h="",t.e="r",t.i=!0,t.j=!!W;for(var r,e=0;r=arguments[e];e++)for(var u in r)t[u]=r[u];
e=t.a,t.d=/^[^,]+/.exec(e)[0],r=Function,e="return function("+e+"){",u="var m,r="+t.d+",C="+t.e+";if(!r)return C;"+t.h+";",t.b?(u+="var s=r.length;m=-1;if("+t.b+"){",V.unindexedChars&&(u+="if(q(r)){r=r.split('')}"),u+="while(++m<s){"+t.f+";}}else{"):V.nonEnumArgs&&(u+="var s=r.length;m=-1;if(s&&n(r)){while(++m<s){m+='';"+t.f+";}}else{"),V.enumPrototypes&&(u+="var E=typeof r=='function';"),V.enumErrorProps&&(u+="var D=r===j||r instanceof Error;");var c=[];if(V.enumPrototypes&&c.push('!(E&&m=="prototype")'),V.enumErrorProps&&c.push('!(D&&(m=="message"||m=="name"))'),t.i&&t.j)u+="var A=-1,B=z[typeof r]&&t(r),s=B?B.length:0;while(++A<s){m=B[A];",c.length&&(u+="if("+c.join("&&")+"){"),u+=t.f+";",c.length&&(u+="}"),u+="}";
else if(u+="for(m in r){",t.i&&c.push("l.call(r, m)"),c.length&&(u+="if("+c.join("&&")+"){"),u+=t.f+";",c.length&&(u+="}"),u+="}",V.nonEnumShadows){for(u+="if(r!==y){var h=r.constructor,p=r===(h&&h.prototype),e=r===H?G:r===j?i:J.call(r),v=w[e];",k=0;7>k;k++)u+="m='"+t.g[k]+"';if((!(p&&v[m])&&l.call(r,m))",t.i||(u+="||(!v[m]&&r[m]!==y[m])"),u+="){"+t.f+"}";u+="}"}return(t.b||V.nonEnumArgs)&&(u+="}"),u+=t.c+";return C",r=r("i,j,l,n,o,q,t,u,y,z,w,G,H,J",e+u+"}"),n(t),r(E,F,q,a,Q,l,W,o,z,A,L,S,D,$)}function a(t){return $.call(t)==v
}function c(t,n,u,i,l,s){var p=u===h;if(typeof u=="function"&&!p){u=o.createCallback(u,i,2);var g=u(t,n);if(typeof g!="undefined")return!!g}if(t===n)return 0!==t||1/t==1/n;var y=typeof t,b=typeof n;if(t===t&&(!t||"function"!=y&&"object"!=y)&&(!n||"function"!=b&&"object"!=b))return!1;if(null==t||null==n)return t===n;if(b=$.call(t),y=$.call(n),b==v&&(b=x),y==v&&(y=x),b!=y)return!1;switch(b){case O:case C:return+t==+n;case _:return t!=+t?n!=+n:0==t?1/t==1/n:t==+n;case w:case S:return t==n+""}if(y=b==j,!y){if(q.call(t,"__wrapped__")||q.call(n,"__wrapped__"))return c(t.__wrapped__||t,n.__wrapped__||n,u,i,l,s);
if(b!=x||!V.nodeClass&&(r(t)||r(n)))return!1;var b=!V.argsObject&&a(t)?Object:t.constructor,d=!V.argsObject&&a(n)?Object:n.constructor;if(b!=d&&(!f(b)||!(b instanceof b&&f(d)&&d instanceof d)))return!1}for(d=!l,l||(l=m.pop()||[]),s||(s=m.pop()||[]),b=l.length;b--;)if(l[b]==t)return s[b]==n;var E=0,g=!0;if(l.push(t),s.push(n),y){if(b=t.length,E=n.length,g=E==t.length,!g&&!p)return g;for(;E--;)if(y=b,d=n[E],p)for(;y--&&!(g=c(t[y],d,u,i,l,s)););else if(!(g=c(t[E],d,u,i,l,s)))break;return g}return Y(n,function(r,e,n){return q.call(n,e)?(E++,g=q.call(t,e)&&c(t[e],r,u,i,l,s)):void 0
}),g&&!p&&Y(t,function(t,r,e){return q.call(e,r)?g=-1<--E:void 0}),d&&(e(l),e(s)),g}function f(t){return typeof t=="function"}function i(t){return!(!t||!A[typeof t])}function l(t){return typeof t=="string"||$.call(t)==S}function s(t,r,e){if(r&&typeof e=="undefined"&&Q(t)){e=-1;for(var n=t.length;++e<n&&false!==r(t[e],e,t););}else X(t,r,e);return t}function p(t){return t}var m=[],g=[],h={},y=40,b=(b=/\bthis\b/)&&b.test(function(){return this})&&b,d="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),v="[object Arguments]",j="[object Array]",O="[object Boolean]",C="[object Date]",E="[object Error]",_="[object Number]",x="[object Object]",w="[object RegExp]",S="[object String]",A={"boolean":!1,"function":!0,object:!0,number:!1,string:!1,undefined:!1},P=A[typeof exports]&&exports,I=A[typeof module]&&module&&module.exports==P&&module,B=A[typeof global]&&global;
!B||B.global!==B&&B.window!==B||(t=B);var F=Error.prototype,z=Object.prototype,D=String.prototype,B=RegExp("^"+(z.valueOf+"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/valueOf|for [^\]]+/g,".+?")+"$"),N=Function.prototype.toString,q=z.hasOwnProperty,R=z.propertyIsEnumerable,$=z.toString,M=B.test(M=$.bind)&&M,T=B.test(T=Object.create)&&T,G=B.test(G=Array.isArray)&&G,H=B.test(H=Object.keys)&&H,T=B.test(t.attachEvent),J=M&&!/\n|true/.test(M+T),L={};L[j]=L[C]=L[_]={constructor:!0,toLocaleString:!0,toString:!0,valueOf:!0},L[O]=L[S]={constructor:!0,toString:!0,valueOf:!0},L[E]=L["[object Function]"]=L[w]={constructor:!0,toString:!0},L[x]={constructor:!0},function(){for(var t=d.length;t--;){var r,e=d[t];
for(r in L)q.call(L,r)&&!q.call(L[r],e)&&(L[r][e]=!1)}}();var V=o.support={};!function(){var t=function(){this.x=1},r=[];t.prototype={valueOf:1,y:1};for(var e in new t)r.push(e);for(e in arguments);V.argsObject=arguments.constructor==Object&&!(arguments instanceof Array),V.argsClass=a(arguments),V.enumErrorProps=R.call(F,"message")||R.call(F,"name"),V.enumPrototypes=R.call(t,"prototype"),V.fastBind=M&&!J,V.nonEnumArgs=0!=e,V.nonEnumShadows=!/valueOf/.test(r),V.unindexedChars="xx"!="x"[0]+Object("x")[0];
try{V.nodeClass=!($.call(document)==x&&!({toString:0}+""))}catch(n){V.nodeClass=!0}}(1);var K={a:"x,F,k",h:"var a=arguments,b=0,c=typeof k=='number'?2:a.length;while(++b<c){r=a[b];if(r&&z[typeof r]){",f:"if(typeof C[m]=='undefined')C[m]=r[m]",c:"}}"},T={a:"f,d,I",h:"d=d&&typeof I=='undefined'?d:u.createCallback(d,I)",b:"typeof s=='number'",f:"if(d(r[m],m,f)===false)return C"},B={h:"if(!z[typeof r])return C;"+T.h,b:!1};V.argsClass||(a=function(t){return t?q.call(t,"callee"):!1});var Q=G||function(t){return t?typeof t=="object"&&$.call(t)==j:!1
},U=u({a:"x",e:"[]",h:"if(!(z[typeof x]))return C",f:"C.push(m)"}),W=H?function(t){return i(t)?V.enumPrototypes&&typeof t=="function"||V.nonEnumArgs&&t.length&&a(t)?U(t):H(t):[]}:U,X=u(T),G=u(K,{h:K.h.replace(";",";if(c>3&&typeof a[c-2]=='function'){var d=u.createCallback(a[--c-1],a[c--],2)}else if(c>2&&typeof a[c-1]=='function'){d=a[--c]}"),f:"C[m]=d?d(C[m],r[m]):r[m]"}),Y=u(T,B,{i:!1});f(/x/)&&(f=function(t){return typeof t=="function"&&"[object Function]"==$.call(t)}),o.assign=G,o.createCallback=function(t,r,e){if(null==t)return p;
var n=typeof t;if("function"!=n){if("object"!=n)return function(r){return r[t]};var o=W(t);return function(r){for(var e=o.length,n=!1;e--&&(n=c(r[o[e]],t[o[e]],h)););return n}}return typeof r=="undefined"||b&&!b.test(N.call(t))?t:1===e?function(e){return t.call(r,e)}:2===e?function(e,n){return t.call(r,e,n)}:4===e?function(e,n,o,u){return t.call(r,e,n,o,u)}:function(e,n,o){return t.call(r,e,n,o)}},o.forEach=s,o.forIn=Y,o.keys=W,o.each=s,o.extend=G,o.identity=p,o.isArguments=a,o.isArray=Q,o.isEqual=c,o.isFunction=f,o.isObject=i,o.isString=l,o.VERSION="1.3.1",typeof define=="function"&&typeof define.amd=="object"&&define.amd?(t._=o, define(function(){return o
})):P&&!P.nodeType?I?(I.exports=o)._=o:P._=o:t._=o}(this);
})(self)
},{}],73:[function(require,module,exports){
var _ = require('./vendor/lodash');
var serializer = new XMLSerializer();
var XML_NS = 'http://www.w3.org/XML/1998/namespace';
var TOP_LEVEL_LOOKUP = {};
var LOOKUP = {};
var LOOKUP_EXT = {};


var find = exports.find = function (xml, NS, selector) {
    var children = xml.querySelectorAll(selector);
    return _.filter(children, function (child) {
        return child.namespaceURI === NS && child.parentNode == xml;
    });
};

exports.findOrCreate = function (xml, NS, selector) {
    var existing = find(xml, NS, selector);
    if (existing.length) {
        return existing[0];
    } else {
        var created = document.createElementNS(NS, selector);
        xml.appendChild(created);
        return created;
    }
};

exports.init = function (self, xml, data) {
    self.xml = xml || document.createElementNS(self.NS, self.EL);
    if (!self.xml.parentNode || self.xml.parentNode.namespaceURI !== self.NS) {
        self.xml.setAttribute('xmlns', self.NS);
    }

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
    return self;
};

exports.getSubText = function (xml, NS, element) {
    var subs = find(xml, NS, element);
    if (!subs) {
        return '';
    }

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].namespaceURI === NS) {
            return subs[i].textContent || '';
        }
    }
    
    return '';
};

exports.getMultiSubText = function (xml, NS, element, extractor) {
    var subs = find(xml, NS, element);
    var results = [];
    extractor = extractor || function (sub) {
        return sub.textContent || '';
    };

    for (var i = 0; i < subs.length; i++) {
        if (subs[i].namespaceURI === NS) {
            results.push(extractor(subs[i]));
        }
    }
    
    return results;
};

exports.getSubLangText = function (xml, NS, element, defaultLang) {
    var subs = find(xml, NS, element);
    if (!subs) {
        return {};
    }

    var lang, sub;
    var results = {};
    var langs = [];

    for (var i = 0; i < subs.length; i++) {
        sub = subs[i];
        if (sub.namespaceURI === NS) {
            lang = sub.getAttributeNS(XML_NS, 'lang') || defaultLang;
            langs.push(lang);
            results[lang] = sub.textContent || '';
        }
    }
    
    return results;
};


exports.setSubText = function (xml, NS, element, value) {
    var subs = find(xml, NS, element);
    if (!subs.length) {
        if (value) {
            var sub = document.createElementNS(NS, element);
            sub.textContent = value;
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].namespaceURI === NS) {
                if (value) {
                    subs[i].textContent = value;
                    return;
                } else {
                    xml.removeChild(subs[i]);
                }
            }
        }
    }
};

exports.setMultiSubText = function (xml, NS, element, value, builder) {
    var subs = find(xml, NS, element);
    var values = [];
    builder = builder || function (value) {
        var sub = document.createElementNS(NS, element);
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

exports.setSubLangText = function (xml, NS, element, value, defaultLang) {
    var sub, lang;
    var subs = find(xml, NS, element);
    if (subs.length) {
        for (var i = 0; i < subs.length; i++) {
            sub = subs[i];
            if (sub.namespaceURI === NS) {
                xml.removeChild(sub);
            }
        }
    }

    if (typeof value === 'string') {
        sub = document.createElementNS(NS, element);
        sub.textContent = value;
        xml.appendChild(sub);
    } else if (typeof value === 'object') {
        for (lang in value) {
            if (value.hasOwnProperty(lang)) {
                sub = document.createElementNS(NS, element);
                if (lang !== defaultLang) {
                    sub.setAttributeNS(XML_NS, 'lang', lang);
                }
                sub.textContent = value[lang];
                xml.appendChild(sub);
            }
        }
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
        if (subs[i].namespaceURI === NS) {
            return subs[i].getAttribute(attr) || defaultVal || '';
        }
    }
    
    return '';
};

exports.setSubAttribute = function (xml, NS, sub, attr, value) {
    var subs = find(xml, NS, sub);
    if (!subs.length) {
        if (value) {
            sub = document.createElementNS(NS, sub);
            sub.setAttribute(attr, value);
            xml.appendChild(sub);
        }
    } else {
        for (var i = 0; i < subs.length; i++) {
            if (subs[i].namespaceURI === NS) {
                if (value) {
                    subs[i].setAttribute(attr, value);
                    return;
                } else {
                    subs[i].removeAttribute(attr);
                }
            }
        }
    }
};

exports.toString = function () {
    return serializer.serializeToString(this.xml);
};

exports.toJSON = function () {
    var prop;
    var result = {};
    var exclude = {
        constructor: true,
        NS: true,
        EL: true,
        toString: true,
        toJSON: true,
        _extensions: true,
        prototype: true,
        xml: true,
        parent: true,
        _name: true
    };
    for (prop in this._extensions) {
        if (this._extensions[prop].toJSON) {
            result[prop] = this._extensions[prop].toJSON();
        }
    }
    for (prop in this) {
        if (!exclude[prop] && !((LOOKUP_EXT[this.NS + '|' + this.EL] || {})[prop]) && !this._extensions[prop] && prop[0] !== '_') {
            var val = this[prop];
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
};

exports.extend = function (ParentJXT, ChildJXT) {
    var parentName = ParentJXT.prototype.NS + '|' + ParentJXT.prototype.EL;
    var name = ChildJXT.prototype._name;
    var qName = ChildJXT.prototype.NS + '|' + ChildJXT.prototype.EL;

    LOOKUP[qName] = ChildJXT;
    if (!LOOKUP_EXT[qName]) {
        LOOKUP_EXT[qName] = {};
    }
    if (!LOOKUP_EXT[parentName]) {
        LOOKUP_EXT[parentName] = {};
    }
    LOOKUP_EXT[parentName][name] = ChildJXT;

    ParentJXT.prototype.__defineGetter__(name, function () {
        if (!this._extensions[name]) {
            var existing = exports.find(this.xml, ChildJXT.prototype.NS, ChildJXT.prototype.EL);
            if (!existing.length) {
                this._extensions[name] = new ChildJXT();
                this.xml.appendChild(this._extensions[name].xml);
            } else {
                this._extensions[name] = new ChildJXT(null, existing[0]);
            }
            this._extensions[name].parent = this;
        }
        return this._extensions[name];
    });
    ParentJXT.prototype.__defineSetter__(name, function (value) {
        var child = this[name];
        _.extend(child, value);
    });
};

exports.topLevel = function (JXT) {
    var name = JXT.prototype.NS + '|' + JXT.prototype.EL;
    LOOKUP[name] = JXT;
    TOP_LEVEL_LOOKUP[name] = JXT;
};

exports.build = function (xml) {
    var JXT = TOP_LEVEL_LOOKUP[xml.namespaceURI + '|' + xml.localName];
    if (JXT) {
        return new JXT(null, xml);
    }
};

exports.XML_NS = XML_NS;
exports.TOP_LEVEL_LOOKUP = TOP_LEVEL_LOOKUP;
exports.LOOKUP_EXT = LOOKUP_EXT;
exports.LOOKUP = LOOKUP;

},{"./vendor/lodash":74}],74:[function(require,module,exports){
(function(global){/**
 * @license
 * Lo-Dash 1.3.1 (Custom Build) lodash.com/license
 * Build: `lodash include="each,extend,filter"`
 * Underscore.js 1.4.4 underscorejs.org/LICENSE
 */
;!function(t){function r(t){return typeof t.toString!="function"&&typeof(t+"")=="string"}function e(t){t.length=0,g.length<y&&g.push(t)}function n(t){var r=t.k;r&&n(r),t.b=t.k=t.object=t.number=t.string=null,h.length<y&&h.push(t)}function o(){}function u(){var t=h.pop()||{a:"",b:null,c:"",k:null,"false":!1,d:"",e:"",f:"","null":!1,number:null,object:null,push:null,g:null,string:null,h:"","true":!1,undefined:!1,i:!1,j:!1};t.g=v,t.b=t.c=t.f=t.h="",t.e="r",t.i=!0,t.j=!!X;for(var r,e=0;r=arguments[e];e++)for(var u in r)t[u]=r[u];
e=t.a,t.d=/^[^,]+/.exec(e)[0],r=Function,e="return function("+e+"){",u="var m,r="+t.d+",C="+t.e+";if(!r)return C;"+t.h+";",t.b?(u+="var s=r.length;m=-1;if("+t.b+"){",K.unindexedChars&&(u+="if(q(r)){r=r.split('')}"),u+="while(++m<s){"+t.f+";}}else{"):K.nonEnumArgs&&(u+="var s=r.length;m=-1;if(s&&n(r)){while(++m<s){m+='';"+t.f+";}}else{"),K.enumPrototypes&&(u+="var E=typeof r=='function';"),K.enumErrorProps&&(u+="var D=r===j||r instanceof Error;");var c=[];if(K.enumPrototypes&&c.push('!(E&&m=="prototype")'),K.enumErrorProps&&c.push('!(D&&(m=="message"||m=="name"))'),t.i&&t.j)u+="var A=-1,B=z[typeof r]&&t(r),s=B?B.length:0;while(++A<s){m=B[A];",c.length&&(u+="if("+c.join("&&")+"){"),u+=t.f+";",c.length&&(u+="}"),u+="}";
else if(u+="for(m in r){",t.i&&c.push("l.call(r, m)"),c.length&&(u+="if("+c.join("&&")+"){"),u+=t.f+";",c.length&&(u+="}"),u+="}",K.nonEnumShadows){for(u+="if(r!==y){var h=r.constructor,p=r===(h&&h.prototype),e=r===H?G:r===j?i:J.call(r),v=w[e];",k=0;7>k;k++)u+="m='"+t.g[k]+"';if((!(p&&v[m])&&l.call(r,m))",t.i||(u+="||(!v[m]&&r[m]!==y[m])"),u+="){"+t.f+"}";u+="}"}return(t.b||K.nonEnumArgs)&&(u+="}"),u+=t.c+";return C",r=r("i,j,l,n,o,q,t,u,y,z,w,G,H,J",e+u+"}"),n(t),r(_,z,R,a,U,l,X,o,D,P,V,A,N,M)}function a(t){return M.call(t)==j
}function c(t,n,u,i,l,s){var p=u===b;if(typeof u=="function"&&!p){u=o.createCallback(u,i,2);var m=u(t,n);if(typeof m!="undefined")return!!m}if(t===n)return 0!==t||1/t==1/n;var h=typeof t,y=typeof n;if(t===t&&(!t||"function"!=h&&"object"!=h)&&(!n||"function"!=y&&"object"!=y))return!1;if(null==t||null==n)return t===n;if(y=M.call(t),h=M.call(n),y==j&&(y=w),h==j&&(h=w),y!=h)return!1;switch(y){case O:case E:return+t==+n;case x:return t!=+t?n!=+n:0==t?1/t==1/n:t==+n;case S:case A:return t==n+""}if(h=y==C,!h){if(R.call(t,"__wrapped__")||R.call(n,"__wrapped__"))return c(t.__wrapped__||t,n.__wrapped__||n,u,i,l,s);
if(y!=w||!K.nodeClass&&(r(t)||r(n)))return!1;var y=!K.argsObject&&a(t)?Object:t.constructor,d=!K.argsObject&&a(n)?Object:n.constructor;if(y!=d&&(!f(y)||!(y instanceof y&&f(d)&&d instanceof d)))return!1}for(d=!l,l||(l=g.pop()||[]),s||(s=g.pop()||[]),y=l.length;y--;)if(l[y]==t)return s[y]==n;var v=0,m=!0;if(l.push(t),s.push(n),h){if(y=t.length,v=n.length,m=v==t.length,!m&&!p)return m;for(;v--;)if(h=y,d=n[v],p)for(;h--&&!(m=c(t[h],d,u,i,l,s)););else if(!(m=c(t[v],d,u,i,l,s)))break;return m}return Z(n,function(r,e,n){return R.call(n,e)?(v++,m=R.call(t,e)&&c(t[e],r,u,i,l,s)):void 0
}),m&&!p&&Z(t,function(t,r,e){return R.call(e,r)?m=-1<--v:void 0}),d&&(e(l),e(s)),m}function f(t){return typeof t=="function"}function i(t){return!(!t||!P[typeof t])}function l(t){return typeof t=="string"||M.call(t)==A}function s(t,r,e){var n=[];if(r=o.createCallback(r,e),U(t)){e=-1;for(var u=t.length;++e<u;){var a=t[e];r(a,e,t)&&n.push(a)}}else Y(t,function(t,e,o){r(t,e,o)&&n.push(t)});return n}function p(t,r,e){if(r&&typeof e=="undefined"&&U(t)){e=-1;for(var n=t.length;++e<n&&false!==r(t[e],e,t););}else Y(t,r,e);
return t}function m(t){return t}var g=[],h=[],b={},y=40,d=(d=/\bthis\b/)&&d.test(function(){return this})&&d,v="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),j="[object Arguments]",C="[object Array]",O="[object Boolean]",E="[object Date]",_="[object Error]",x="[object Number]",w="[object Object]",S="[object RegExp]",A="[object String]",P={"boolean":!1,"function":!0,object:!0,number:!1,string:!1,undefined:!1},I=P[typeof exports]&&exports,B=P[typeof module]&&module&&module.exports==I&&module,F=P[typeof global]&&global;
!F||F.global!==F&&F.window!==F||(t=F);var z=Error.prototype,D=Object.prototype,N=String.prototype,F=RegExp("^"+(D.valueOf+"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/valueOf|for [^\]]+/g,".+?")+"$"),q=Function.prototype.toString,R=D.hasOwnProperty,$=D.propertyIsEnumerable,M=D.toString,T=F.test(T=M.bind)&&T,G=F.test(G=Object.create)&&G,H=F.test(H=Array.isArray)&&H,J=F.test(J=Object.keys)&&J,G=F.test(t.attachEvent),L=T&&!/\n|true/.test(T+G),V={};V[C]=V[E]=V[x]={constructor:!0,toLocaleString:!0,toString:!0,valueOf:!0},V[O]=V[A]={constructor:!0,toString:!0,valueOf:!0},V[_]=V["[object Function]"]=V[S]={constructor:!0,toString:!0},V[w]={constructor:!0},function(){for(var t=v.length;t--;){var r,e=v[t];
for(r in V)R.call(V,r)&&!R.call(V[r],e)&&(V[r][e]=!1)}}();var K=o.support={};!function(){var t=function(){this.x=1},r=[];t.prototype={valueOf:1,y:1};for(var e in new t)r.push(e);for(e in arguments);K.argsObject=arguments.constructor==Object&&!(arguments instanceof Array),K.argsClass=a(arguments),K.enumErrorProps=$.call(z,"message")||$.call(z,"name"),K.enumPrototypes=$.call(t,"prototype"),K.fastBind=T&&!L,K.nonEnumArgs=0!=e,K.nonEnumShadows=!/valueOf/.test(r),K.unindexedChars="xx"!="x"[0]+Object("x")[0];
try{K.nodeClass=!(M.call(document)==w&&!({toString:0}+""))}catch(n){K.nodeClass=!0}}(1);var Q={a:"x,F,k",h:"var a=arguments,b=0,c=typeof k=='number'?2:a.length;while(++b<c){r=a[b];if(r&&z[typeof r]){",f:"if(typeof C[m]=='undefined')C[m]=r[m]",c:"}}"},G={a:"f,d,I",h:"d=d&&typeof I=='undefined'?d:u.createCallback(d,I)",b:"typeof s=='number'",f:"if(d(r[m],m,f)===false)return C"},F={h:"if(!z[typeof r])return C;"+G.h,b:!1};K.argsClass||(a=function(t){return t?R.call(t,"callee"):!1});var U=H||function(t){return t?typeof t=="object"&&M.call(t)==C:!1
},W=u({a:"x",e:"[]",h:"if(!(z[typeof x]))return C",f:"C.push(m)"}),X=J?function(t){return i(t)?K.enumPrototypes&&typeof t=="function"||K.nonEnumArgs&&t.length&&a(t)?W(t):J(t):[]}:W,Y=u(G),H=u(Q,{h:Q.h.replace(";",";if(c>3&&typeof a[c-2]=='function'){var d=u.createCallback(a[--c-1],a[c--],2)}else if(c>2&&typeof a[c-1]=='function'){d=a[--c]}"),f:"C[m]=d?d(C[m],r[m]):r[m]"}),Z=u(G,F,{i:!1});f(/x/)&&(f=function(t){return typeof t=="function"&&"[object Function]"==M.call(t)}),o.assign=H,o.createCallback=function(t,r,e){if(null==t)return m;
var n=typeof t;if("function"!=n){if("object"!=n)return function(r){return r[t]};var o=X(t);return function(r){for(var e=o.length,n=!1;e--&&(n=c(r[o[e]],t[o[e]],b)););return n}}return typeof r=="undefined"||d&&!d.test(q.call(t))?t:1===e?function(e){return t.call(r,e)}:2===e?function(e,n){return t.call(r,e,n)}:4===e?function(e,n,o,u){return t.call(r,e,n,o,u)}:function(e,n,o){return t.call(r,e,n,o)}},o.filter=s,o.forEach=p,o.forIn=Z,o.keys=X,o.each=p,o.extend=H,o.select=s,o.identity=m,o.isArguments=a,o.isArray=U,o.isEqual=c,o.isFunction=f,o.isObject=i,o.isString=l,o.VERSION="1.3.1",typeof define=="function"&&typeof define.amd=="object"&&define.amd?(t._=o, define(function(){return o
})):I&&!I.nodeType?B?(B.exports=o)._=o:I._=o:t._=o}(this);
})(self)
},{}],75:[function(require,module,exports){
(function(Buffer){//     uuid.js
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

})(require("__browserify_Buffer").Buffer)
},{"__browserify_Buffer":64,"crypto":60}],76:[function(require,module,exports){
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

},{}],77:[function(require,module,exports){
(function(global){/**
 * @license
 * Lo-Dash 1.3.1 (Custom Build) ../../vendor/lodash.com/license
 * Build: `../../vendor/lodash include="each,unique"`
 * Underscore.js 1.4.4 underscorejs.org/LICENSE
 */
;(function(G){function H(a,d,b){b=(b||0)-1;for(var c=a.length;++b<c;)if(a[b]===d)return b;return-1}function oa(a,d){var b=typeof d;a=a.k;if("boolean"==b||null==d)return a[d];"number"!=b&&"string"!=b&&(b="object");var c="number"==b?d:Z+d;a=a[b]||(a[b]={});return"object"==b?a[c]&&-1<H(a[c],d)?0:-1:a[c]?0:-1}function pa(a){var d=this.k,b=typeof a;if("boolean"==b||null==a)d[a]=!0;else{"number"!=b&&"string"!=b&&(b="object");var c="number"==b?a:Z+a,e=d[b]||(d[b]={});if("object"==b){if((e[c]||(e[c]=[])).push(a)==
this.b.length)d[b]=!1}else e[c]=!0}}function O(){return P.pop()||{a:"",b:null,c:"",k:null,"false":!1,d:"",e:"",f:"","null":!1,number:null,object:null,push:null,g:null,string:null,h:"","true":!1,undefined:!1,i:!1,j:!1}}function $(a){return typeof a.toString!="function"&&typeof(a+"")=="string"}function y(a){a.length=0;z.length<aa&&z.push(a)}function I(a){var d=a.k;d&&I(d);a.b=a.k=a.object=a.number=a.string=null;P.length<aa&&P.push(a)}function g(){}function Q(){var a=O();a.g=R;a.b=a.c=a.f=a.h="";a.e=
"r";a.i=!0;a.j=!!J;for(var d,b=0;d=arguments[b];b++)for(var c in d)a[c]=d[c];b=a.a;a.d=/^[^,]+/.exec(b)[0];d=Function;b="return function("+b+"){";c="var m,r="+a.d+",C="+a.e+";if(!r)return C;"+a.h+";";a.b?(c+="var s=r.length;m=-1;if("+a.b+"){",h.unindexedChars&&(c+="if(q(r)){r=r.split('')}"),c+="while(++m<s){"+a.f+";}}else{"):h.nonEnumArgs&&(c+="var s=r.length;m=-1;if(s&&n(r)){while(++m<s){m+='';"+a.f+";}}else{");h.enumPrototypes&&(c+="var E=typeof r=='function';");h.enumErrorProps&&(c+="var D=r===j||r instanceof Error;");
var e=[];h.enumPrototypes&&e.push('!(E&&m=="prototype")');h.enumErrorProps&&e.push('!(D&&(m=="message"||m=="name"))');if(a.i&&a.j)c+="var A=-1,B=z[typeof r]&&t(r),s=B?B.length:0;while(++A<s){m=B[A];",e.length&&(c+="if("+e.join("&&")+"){"),c+=a.f+";",e.length&&(c+="}"),c+="}";else if(c+="for(m in r){",a.i&&e.push("l.call(r, m)"),e.length&&(c+="if("+e.join("&&")+"){"),c+=a.f+";",e.length&&(c+="}"),c+="}",h.nonEnumShadows){c+="if(r!==y){var h=r.constructor,p=r===(h&&h.prototype),e=r===H?G:r===j?i:J.call(r),v=w[e];";
for(k=0;7>k;k++)c+="m='"+a.g[k]+"';if((!(p&&v[m])&&l.call(r,m))",a.i||(c+="||(!v[m]&&r[m]!==y[m])"),c+="){"+a.f+"}";c+="}"}if(a.b||h.nonEnumArgs)c+="}";c+=a.c+";return C";d=d("i,j,l,n,o,q,t,u,y,z,w,G,H,J",b+c+"}");I(a);return d(ba,S,p,v,T,ca,J,g,A,B,l,K,qa,q)}function v(a){return q.call(a)==U}function w(a,d,b,c,e,r){var L=b===da;if(typeof b=="function"&&!L){b=g.createCallback(b,c,2);var n=b(a,d);if(typeof n!="undefined")return!!n}if(a===d)return 0!==a||1/a==1/d;var m=typeof a,f=typeof d;if(a===a&&
(!a||"function"!=m&&"object"!=m)&&(!d||"function"!=f&&"object"!=f))return!1;if(null==a||null==d)return a===d;f=q.call(a);m=q.call(d);f==U&&(f=C);m==U&&(m=C);if(f!=m)return!1;switch(f){case ea:case fa:return+a==+d;case ga:return a!=+a?d!=+d:0==a?1/a==1/d:a==+d;case ha:case K:return a==String(d)}m=f==V;if(!m){if(p.call(a,"__wrapped__")||p.call(d,"__wrapped__"))return w(a.__wrapped__||a,d.__wrapped__||d,b,c,e,r);if(f!=C||!h.nodeClass&&($(a)||$(d)))return!1;var f=!h.argsObject&&v(a)?Object:a.constructor,
t=!h.argsObject&&v(d)?Object:d.constructor;if(f!=t&&(!D(f)||!(f instanceof f&&D(t)&&t instanceof t)))return!1}t=!e;e||(e=z.pop()||[]);r||(r=z.pop()||[]);for(f=e.length;f--;)if(e[f]==a)return r[f]==d;var l=0,n=!0;e.push(a);r.push(d);if(m){f=a.length;l=d.length;n=l==a.length;if(!n&&!L)return n;for(;l--;)if(m=f,t=d[l],L)for(;m--&&!(n=w(a[m],t,b,c,e,r)););else if(!(n=w(a[l],t,b,c,e,r)))break;return n}W(d,function(d,f,g){if(p.call(g,f))return l++,n=p.call(a,f)&&w(a[f],d,b,c,e,r)});n&&!L&&W(a,function(a,
b,c){if(p.call(c,b))return n=-1<--l});t&&(y(e),y(r));return n}function D(a){return typeof a=="function"}function ia(a){return!(!a||!B[typeof a])}function ca(a){return typeof a=="string"||q.call(a)==K}function ja(a,d,b){if(d&&typeof b=="undefined"&&T(a)){b=-1;for(var c=a.length;++b<c&&false!==d(a[b],b,a););}else ra(a,d,b);return a}function ka(a,d,b){if(typeof b=="number"){var c=a?a.length:0;b=0>b?sa(0,c+b):b||0}else if(b)return b=la(a,d),a[b]===d?b:-1;return a?H(a,d,b):-1}function la(a,d,b,c){var e=0,r=
a?a.length:e;b=b?g.createCallback(b,c,1):X;for(d=b(d);e<r;)c=e+r>>>1,b(a[c])<d?e=c+1:r=c;return e}function X(a){return a}var z=[],P=[],da={},Z=+new Date+"",aa=40,E=(E=/\bthis\b/)&&E.test(function(){return this})&&E,R="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" "),U="[object Arguments]",V="[object Array]",ea="[object Boolean]",fa="[object Date]",ba="[object Error]",ga="[object Number]",C="[object Object]",ha="[object RegExp]",K="[object String]",
B={"boolean":!1,"function":!0,object:!0,number:!1,string:!1,undefined:!1},M=B[typeof exports]&&exports,ma=B[typeof module]&&module&&module.exports==M&&module,s=B[typeof global]&&global;if(s&&(s.global===s||s.window===s))G=s;var S=Error.prototype,A=Object.prototype,qa=String.prototype,s=RegExp("^"+String(A.valueOf).replace(/[.*+?^${}()|[\]\\]/g,"\\$&").replace(/valueOf|for [^\]]+/g,".+?")+"$"),ta=Function.prototype.toString,p=A.hasOwnProperty,Y=A.propertyIsEnumerable,q=A.toString,F=s.test(F=q.bind)&&
F,u=s.test(u=Object.create)&&u,x=s.test(x=Array.isArray)&&x,N=s.test(N=Object.keys)&&N,sa=Math.max,u=s.test(G.attachEvent),ua=F&&!/\n|true/.test(F+u),l={};l[V]=l[fa]=l[ga]={constructor:!0,toLocaleString:!0,toString:!0,valueOf:!0};l[ea]=l[K]={constructor:!0,toString:!0,valueOf:!0};l[ba]=l["[object Function]"]=l[ha]={constructor:!0,toString:!0};l[C]={constructor:!0};(function(){for(var a=R.length;a--;){var d=R[a],b;for(b in l)p.call(l,b)&&!p.call(l[b],d)&&(l[b][d]=!1)}})();var h=g.support={};(function(){var a=
function(){this.x=1},d=[];a.prototype={valueOf:1,y:1};for(var b in new a)d.push(b);for(b in arguments);h.argsObject=arguments.constructor==Object&&!(arguments instanceof Array);h.argsClass=v(arguments);h.enumErrorProps=Y.call(S,"message")||Y.call(S,"name");h.enumPrototypes=Y.call(a,"prototype");h.fastBind=F&&!ua;h.nonEnumArgs=0!=b;h.nonEnumShadows=!/valueOf/.test(d);h.unindexedChars="xx"!="x"[0]+Object("x")[0];try{h.nodeClass=!(q.call(document)==C&&!({toString:0}+""))}catch(c){h.nodeClass=!0}})(1);u={a:"f,d,I",h:"d=d&&typeof I=='undefined'?d:u.createCallback(d,I)",
b:"typeof s=='number'",f:"if(d(r[m],m,f)===false)return C"};s={h:"if(!z[typeof r])return C;"+u.h,b:!1};h.argsClass||(v=function(a){return a?p.call(a,"callee"):!1});var T=x||function(a){return a?typeof a=="object"&&q.call(a)==V:!1},na=Q({a:"x",e:"[]",h:"if(!(z[typeof x]))return C",f:"C.push(m)"}),J=!N?na:function(a){return!ia(a)?[]:h.enumPrototypes&&typeof a=="function"||h.nonEnumArgs&&a.length&&v(a)?na(a):N(a)},ra=Q(u),W=Q(u,s,{i:!1});D(/x/)&&(D=function(a){return typeof a=="function"&&"[object Function]"==
q.call(a)});x=function(a){return function(d,b,c,e){typeof b!="boolean"&&null!=b&&(e=c,c=!(e&&e[b]===d)?b:void 0,b=!1);null!=c&&(c=g.createCallback(c,e));return a(d,b,c,e)}}(function(a,d,b){var c=-1,e;e=(e=g.indexOf)===ka?H:e;var r=a?a.length:0,h=[],n=!d&&75<=r&&e===H,m=b||n?z.pop()||[]:h;if(n){var f;f=m;var l=-1,s=f.length,p=O();p["false"]=p["null"]=p["true"]=p.undefined=!1;var q=O();q.b=f;q.k=p;for(q.push=pa;++l<s;)q.push(f[l]);(f=false===p.object?(I(q),null):q)?(e=oa,m=f):(n=!1,m=b?m:(y(m),h))}for(;++c<
r;)if(f=a[c],l=b?b(f,c,a):f,d?!c||m[m.length-1]!==l:0>e(m,l))(b||n)&&m.push(l),h.push(f);n?(y(m.b),I(m)):b&&y(m);return h});g.createCallback=function(a,d,b){if(null==a)return X;var c=typeof a;if("function"!=c){if("object"!=c)return function(b){return b[a]};var e=J(a);return function(b){for(var c=e.length,d=!1;c--&&(d=w(b[e[c]],a[e[c]],da)););return d}}return typeof d=="undefined"||E&&!E.test(ta.call(a))?a:1===b?function(b){return a.call(d,b)}:2===b?function(b,c){return a.call(d,b,c)}:4===b?function(b,
c,e,g){return a.call(d,b,c,e,g)}:function(b,c,e){return a.call(d,b,c,e)}};g.forEach=ja;g.forIn=W;g.keys=J;g.uniq=x;g.each=ja;g.unique=x;g.identity=X;g.indexOf=ka;g.isArguments=v;g.isArray=T;g.isEqual=w;g.isFunction=D;g.isObject=ia;g.isString=ca;g.sortedIndex=la;g.VERSION="1.3.1";typeof define=="function"&&typeof define.amd=="object"&&define.amd?(G._=g, define(function(){return g})):M&&!M.nodeType?ma?(ma.exports=g)._=g:M._=g:G._=g})(this);

})(self)
},{}]},{},[1])(1)
});
;