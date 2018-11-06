const each = require('lodash.foreach');
const extend = require('lodash.assign');
const isArray = require('lodash.isarray');

const jxt = require('jxt');
const WildEmitter = require('wildemitter');

import { JID } from 'xmpp-jid';
import * as uuid from 'uuid';

import * as SASL from './sasl';
import StreamManagement from './sm';
import Protocol from './protocol';

import HostMeta from './plugins/hostmeta';
import Features from './plugins/features';
import SASLPlugin from './plugins/sasl';
import Smacks from './plugins/smacks';
import Bind from './plugins/bind';
import Session from './plugins/session';


const SASL_MECHS = {
    'external': SASL.External,
    'scram-sha-1': SASL.ScramSha1,
    'digest-md5': SASL.DigestMD5,
    'x-oauth2': SASL.XOauth2,
    'plain': SASL.Plain,
    'anonymous': SASL.Anonymous
};


function timeoutRequest(targetPromise, id, delay) {
    var timeoutRef;
    return Promise.race([
        targetPromise,
        new Promise(function (resolve, reject) {
            timeoutRef = setTimeout(function () {
                reject({
                    id: id,
                    type: 'error',
                    error: {
                        condition: 'timeout'
                    }
                });
            }, delay);
        })
    ]).then(function (result) {
        clearTimeout(timeoutRef);
        return result;
    });
}


export default class Client extends WildEmitter {
    constructor(opts) {
        super();

        var self = this;
        opts = opts || {};
        this._initConfig(opts);

        this.stanzas = jxt.getGlobalJXT();
        this.jid = new JID();
        this.stanzas = jxt.createRegistry();
        this.stanzas.use(Protocol);

        this.use(HostMeta);
        this.use(Features);
        this.use(SASLPlugin);
        this.use(Smacks);
        this.use(Bind);
        this.use(Session);

        this.sm = new StreamManagement(this);
        this.transports = {};

        this.on('stream:data', function (data) {
            var json = data ? data.toJSON() : null;
            if (!json) {
                return;
            }
            if (data._name === 'iq') {
                json._xmlChildCount = 0;
                each(data.xml.childNodes, function (child) {
                    if (child.nodeType === 1) {
                        json._xmlChildCount += 1;
                    }
                });
            }
            self.emit(data._eventname || data._name, json);
            if (data._name === 'message' || data._name === 'presence' || data._name === 'iq') {
                self.sm.handle(json);
                self.emit('stanza', json);
            }
            else if (data._name === 'smAck') {
                return self.sm.process(json);
            }
            else if (data._name === 'smRequest') {
                return self.sm.ack();
            }
            if (json.id) {
                self.emit('id:' + json.id, json);
                self.emit(data._name + ':id:' + json.id, json);
            }
        });

        this.on('disconnected', function () {
            if (self.transport) {
                self.transport.off('*');
                delete self.transport;
            }
            self.releaseGroup('connection');
        });

        this.on('auth:success', function () {
            if (self.transport) {
                self.transport.authenticated = true;
            }
        });

        this.on('iq', function (iq) {
            var iqType = iq.type;
            var xmlChildCount = iq._xmlChildCount;
            delete iq._xmlChildCount;
            var exts = Object.keys(iq).filter(function (ext) {
                return ext !== 'id' &&
                    ext !== 'to' &&
                    ext !== 'from' &&
                    ext !== 'lang' &&
                    ext !== 'type' &&
                    ext !== 'errorReply' &&
                    ext !== 'resultReply';
            });
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
                            condition: 'service-unavailable'
                        }
                    }));
                }
                var iqEvent = 'iq:' + iqType + ':' + exts[0];
                if (self.callbacks[iqEvent]) {
                    self.emit(iqEvent, iq);
                }
                else {
                    // We support the payload data, but there's
                    // nothing registered to handle it.
                    self.sendIq(iq.errorReply({
                        error: {
                            type: 'cancel',
                            condition: 'service-unavailable'
                        }
                    }));
                }
            }
        });

        this.on('message', function (msg) {
            if (Object.keys(msg.$body || {}).length) {
                if (msg.type === 'chat' || msg.type === 'normal') {
                    self.emit('chat', msg);
                }
                else if (msg.type === 'groupchat') {
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

    get stream() {
        return this.transport ? this.transport.stream : undefined;
    }

    _initConfig(opts) {
        var self = this;
        var currConfig = this.config || {};
        this.config = extend({
            useStreamManagement: true,
            transports: ['websocket', 'bosh'],
            sasl: ['external', 'scram-sha-1', 'digest-md5', 'plain', 'anonymous']
        }, currConfig, opts);

        // Enable SASL authentication mechanisms (and their preferred order)
        // based on user configuration.
        if (!isArray(this.config.sasl)) {
            this.config.sasl = [this.config.sasl];
        }
        this.SASLFactory = new SASL.Factory();
        this.config.sasl.forEach(function (mech) {
            if (typeof mech === 'string') {
                var existingMech = SASL_MECHS[mech.toLowerCase()];
                if (existingMech && existingMech.prototype && existingMech.prototype.name) {
                    self.SASLFactory.use(existingMech);
                }
            }
            else {
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
        if (!isArray(this.config.transports)) {
            this.config.transports = [this.config.transports];
        }
    }

    use(pluginInit) {
        if (typeof pluginInit !== 'function') {
            return;
        }
        pluginInit(this, this.stanzas, this.config);
    }

    nextId() {
        return uuid.v4();
    }

    _getConfiguredCredentials() {
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
        var result = extend(defaultCreds, creds);
        return result;
    }

    getCredentials(cb) {
        return cb(null, this._getConfiguredCredentials());
    }

    connect(opts, transInfo) {
        var self = this;
        this._initConfig(opts);
        if (!transInfo && self.config.transports.length === 1) {
            transInfo = {};
            transInfo.name = self.config.transports[0];
        }
        if (transInfo && transInfo.name) {
            if (transInfo.name === 'websocket' || transInfo.name === 'old-websocket') {
                this.use(require('./plugins/websocket').default);
                this.use(require('./plugins/oldwebsocket').default);
            }
            if (transInfo.name === 'bosh') {
                this.use(require('./plugins/bosh').default);
            }
            var trans = self.transport = new self.transports[transInfo.name](self.sm, self.stanzas);
            trans.on('*', function (event, data) {
                self.emit(event, data);
            });
            return trans.connect(self.config);
        }

        return self.discoverBindings(self.config.server, function (err, endpoints) {
            if (err) {
                console.error('Could not find https://' + self.config.server + '/.well-known/host-meta file to discover connection endpoints for the requested transports.');
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
                        }
                        else {
                            self.config.boshURL = uri;
                        }
                        console.log('Using %s endpoint: %s', transport, uri);
                        return self.connect(null, {
                            name: transport,
                            url: uri
                        });
                    }
                    else {
                        console.warn('Discovered unencrypted %s endpoint (%s). Ignoring', transport, uri);
                    }
                }
            }
            console.error('No endpoints found for the requested transports.');
            return self.disconnect();
        });
    }

    disconnect() {
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
        }
        else {
            this.emit('disconnected');
        }
    }

    send(data) {
        this.sm.track(data);
        if (this.transport) {
            this.transport.send(data);
        }
    }

    sendMessage(data) {
        data = data || {};
        if (!data.id) {
            data.id = this.nextId();
        }
        var Message = this.stanzas.getMessage();
        var msg = new Message(data);
        this.emit('message:sent', msg.toJSON());
        this.send(msg);
        return data.id;
    }

    sendPresence(data) {
        data = data || {};
        if (!data.id) {
            data.id = this.nextId();
        }
        var Presence = this.stanzas.getPresence();
        this.send(new Presence(data));
        return data.id;
    }

    sendIq(data, cb) {
        var request, respEvent, allowed, dest;
        var self = this;
        data = data || {};
        if (!data.id) {
            data.id = this.nextId();
        }
        var Iq = this.stanzas.getIq();
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
        respEvent = 'iq:id:' + data.id;
        request = new Promise(function (resolve, reject) {
            var handler = function (res) {
                // Only process result from the correct responder
                if (!allowed[res.from.full]) {
                    return;
                }
                // Only process result or error responses, if the responder
                // happened to send us a request using the same ID value at
                // the same time.
                if (res.type !== 'result' && res.type !== 'error') {
                    return;
                }
                self.off(respEvent, handler);
                if (!res.error) {
                    resolve(res);
                }
                else {
                    reject(res);
                }
            };
            self.on(respEvent, 'session', handler);
        });
        this.send(iq);
        return timeoutRequest(request, data.id, (self.config.timeout || 15) * 1000).then(function (result) {
            if (cb) {
                cb(null, result);
            }
            return result;
        }, function (err) {
            if (cb) {
                return cb(err);
            }
            throw err;
        });
    }

    sendStreamError(data) {
        data = data || {};
        var StreamError = this.stanzas.getStreamError();
        var error = new StreamError(data);
        this.emit('stream:error', error.toJSON());
        this.send(error);
        this.disconnect();
    }
}
