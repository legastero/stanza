import { JID } from 'xmpp-jid';
import * as uuid from 'uuid';
import jxt from 'jxt';
import WildEmitter from 'wildemitter';

import * as SASL from './sasl';
import StreamManagement from './sm';
import Protocol from './protocol';

import HostMeta from './plugins/hostmeta';
import Features from './plugins/features';
import SASLPlugin from './plugins/sasl';
import Smacks from './plugins/smacks';
import Bind from './plugins/bind';
import Session from './plugins/session';

import WebSocket from './transports/websocket';
import BOSH from './transports/bosh';

const SASL_MECHS = {
    anonymous: SASL.Anonymous,
    'digest-md5': SASL.DigestMD5,
    external: SASL.External,
    plain: SASL.Plain,
    'scram-sha-1': SASL.ScramSha1,
    'x-oauth2': SASL.XOauth2
};

function timeoutRequest(targetPromise, id, delay) {
    let timeoutRef;
    return Promise.race([
        targetPromise,
        new Promise(function(resolve, reject) {
            timeoutRef = setTimeout(function() {
                reject({
                    error: {
                        condition: 'timeout'
                    },
                    id: id,
                    type: 'error'
                });
            }, delay);
        })
    ]).then(function(result) {
        clearTimeout(timeoutRef);
        return result;
    });
}

export default class Client extends WildEmitter {
    constructor(opts) {
        super();

        opts = opts || {};
        this._initConfig(opts);

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
        this.transports = {
            bosh: BOSH,
            websocket: WebSocket
        };

        this.on('stream:data', data => {
            const json = data ? data.toJSON() : null;
            if (!json) {
                return;
            }
            if (data._name === 'iq') {
                json._xmlChildCount = 0;
                for (const child of data.xml.childNodes || []) {
                    if (child.nodeType === 1) {
                        json._xmlChildCount += 1;
                    }
                }
            }
            this.emit(data._eventname || data._name, json);
            if (data._name === 'message' || data._name === 'presence' || data._name === 'iq') {
                this.sm.handle(json);
                this.emit('stanza', json);
            } else if (data._name === 'smAck') {
                return this.sm.process(json);
            } else if (data._name === 'smRequest') {
                return this.sm.ack();
            }
            if (json.id) {
                this.emit('id:' + json.id, json);
                this.emit(data._name + ':id:' + json.id, json);
            }
        });

        this.on('disconnected', () => {
            if (this.transport) {
                this.transport.off('*');
                delete this.transport;
            }
            this.releaseGroup('connection');
        });

        this.on('auth:success', () => {
            if (this.transport) {
                this.transport.authenticated = true;
            }
        });

        this.on('iq', iq => {
            const iqType = iq.type;
            const xmlChildCount = iq._xmlChildCount;
            delete iq._xmlChildCount;
            const exts = Object.keys(iq).filter(function(ext) {
                return (
                    ext !== 'id' &&
                    ext !== 'to' &&
                    ext !== 'from' &&
                    ext !== 'lang' &&
                    ext !== 'type' &&
                    ext !== 'errorReply' &&
                    ext !== 'resultReply'
                );
            });
            if (iq.type === 'get' || iq.type === 'set') {
                // Invalid request
                if (xmlChildCount !== 1) {
                    return this.sendIq(
                        iq.errorReply({
                            error: {
                                condition: 'bad-request',
                                type: 'modify'
                            }
                        })
                    );
                }
                // Valid request, but we don't have support for the
                // payload data.
                if (!exts.length) {
                    return this.sendIq(
                        iq.errorReply({
                            error: {
                                condition: 'service-unavailable',
                                type: 'cancel'
                            }
                        })
                    );
                }
                const iqEvent = 'iq:' + iqType + ':' + exts[0];
                if (this.callbacks[iqEvent]) {
                    this.emit(iqEvent, iq);
                } else {
                    // We support the payload data, but there's
                    // nothing registered to handle it.
                    this.sendIq(
                        iq.errorReply({
                            error: {
                                condition: 'service-unavailable',
                                type: 'cancel'
                            }
                        })
                    );
                }
            }
        });

        this.on('message', msg => {
            if (Object.keys(msg.$body || {}).length) {
                if (msg.type === 'chat' || msg.type === 'normal') {
                    this.emit('chat', msg);
                } else if (msg.type === 'groupchat') {
                    this.emit('groupchat', msg);
                }
            }
            if (msg.type === 'error') {
                this.emit('message:error', msg);
            }
        });

        this.on('presence', pres => {
            let presType = pres.type || 'available';
            if (presType === 'error') {
                presType = 'presence:error';
            }
            this.emit(presType, pres);
        });
    }

    get stream() {
        return this.transport ? this.transport.stream : undefined;
    }

    _initConfig(opts) {
        const currConfig = this.config || {};
        this.config = {
            sasl: ['external', 'scram-sha-1', 'digest-md5', 'plain', 'anonymous'],
            transports: ['websocket', 'bosh'],
            useStreamManagement: true,
            ...currConfig,
            ...opts
        };

        // Enable SASL authentication mechanisms (and their preferred order)
        // based on user configuration.
        if (!Array.isArray(this.config.sasl)) {
            this.config.sasl = [this.config.sasl];
        }
        this.SASLFactory = new SASL.Factory();
        for (const mech of this.config.sasl) {
            if (typeof mech === 'string') {
                const existingMech = SASL_MECHS[mech.toLowerCase()];
                if (existingMech && existingMech.prototype && existingMech.prototype.name) {
                    this.SASLFactory.use(existingMech);
                }
            } else {
                this.SASLFactory.use(mech);
            }
        }

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
        if (!Array.isArray(this.config.transports)) {
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
        const creds = this.config.credentials || {};
        const requestedJID = new JID(this.config.jid);
        const username = creds.username || requestedJID.local;
        const server = creds.server || requestedJID.domain;
        return {
            host: server,
            password: this.config.password,
            realm: server,
            server: server,
            serviceName: server,
            serviceType: 'xmpp',
            username: username,
            ...creds
        };
    }

    getCredentials(cb) {
        return cb(null, this._getConfiguredCredentials());
    }

    connect(opts, transInfo) {
        this._initConfig(opts);
        if (!transInfo && this.config.transports.length === 1) {
            transInfo = {};
            transInfo.name = this.config.transports[0];
        }
        if (transInfo && transInfo.name) {
            const trans = (this.transport = new this.transports[transInfo.name](
                this.sm,
                this.stanzas
            ));
            trans.on('*', (event, data) => {
                this.emit(event, data);
            });
            return trans.connect(this.config);
        }

        return this.discoverBindings(this.config.server, (err, endpoints) => {
            if (err) {
                console.error(
                    'Could not find https://' +
                        this.config.server +
                        '/.well-known/host-meta file to discover connection endpoints for the requested transports.'
                );
                return this.disconnect();
            }
            for (let t = 0, tlen = this.config.transports.length; t < tlen; t++) {
                const transport = this.config.transports[t];
                console.log('Checking for %s endpoints', transport);
                for (let i = 0, len = (endpoints[transport] || []).length; i < len; i++) {
                    const uri = endpoints[transport][i];
                    if (uri.indexOf('wss://') === 0 || uri.indexOf('https://') === 0) {
                        if (transport === 'websocket') {
                            this.config.wsURL = uri;
                        } else {
                            this.config.boshURL = uri;
                        }
                        console.log('Using %s endpoint: %s', transport, uri);
                        return this.connect(
                            null,
                            {
                                name: transport,
                                url: uri
                            }
                        );
                    } else {
                        console.warn(
                            'Discovered unencrypted %s endpoint (%s). Ignoring',
                            transport,
                            uri
                        );
                    }
                }
            }
            console.error('No endpoints found for the requested transports.');
            return this.disconnect();
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
        } else {
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
        const Message = this.stanzas.getMessage();
        const msg = new Message(data);
        this.emit('message:sent', msg.toJSON());
        this.send(msg);
        return data.id;
    }

    sendPresence(data) {
        data = data || {};
        if (!data.id) {
            data.id = this.nextId();
        }
        const Presence = this.stanzas.getPresence();
        this.send(new Presence(data));
        return data.id;
    }

    sendIq(data, cb) {
        data = data || {};
        if (!data.id) {
            data.id = this.nextId();
        }
        const Iq = this.stanzas.getIq();
        const iq = !data.toJSON ? new Iq(data) : data;
        if (data.type === 'error' || data.type === 'result') {
            this.send(iq);
            return;
        }
        const dest = new JID(data.to);
        const allowed = {};
        allowed[''] = true;
        allowed[dest.full] = true;
        allowed[dest.bare] = true;
        allowed[dest.domain] = true;
        allowed[this.jid.bare] = true;
        allowed[this.jid.domain] = true;
        const respEvent = 'iq:id:' + data.id;
        const request = new Promise((resolve, reject) => {
            const handler = res => {
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
                this.off(respEvent, handler);
                if (!res.error) {
                    resolve(res);
                } else {
                    reject(res);
                }
            };
            this.on(respEvent, 'session', handler);
        });
        this.send(iq);
        return timeoutRequest(request, data.id, (this.config.timeout || 15) * 1000).then(
            function(result) {
                if (cb) {
                    cb(null, result);
                }
                return result;
            },
            function(err) {
                if (cb) {
                    return cb(err);
                }
                throw err;
            }
        );
    }

    sendStreamError(data) {
        data = data || {};
        const StreamError = this.stanzas.getStreamError();
        const error = new StreamError(data);
        this.emit('stream:error', error.toJSON());
        this.send(error);
        this.disconnect();
    }
}
