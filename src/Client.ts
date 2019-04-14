import WildEmitter from './WildEmitter';

import { Agent, AgentConfig, Transport } from './Definitions';
import * as JXT from './jxt';
import * as SASL from './lib/sasl';
import Bind from './plugins/bind';
import Features from './plugins/features';
import HostMeta from './plugins/hostmeta';
import SASLPlugin from './plugins/sasl';
import Session from './plugins/session';
import Smacks from './plugins/smacks';
import * as JID from './protocol/JID';
import { IQ, Message, Presence, StreamError } from './protocol/stanzas';
import Protocol from './protocol/stanzas';
import StreamManagement from './StreamManagement';
import BOSH from './transports/bosh';
import WebSocket from './transports/websocket';
import { timeoutPromise, uuid } from './Utils';

const SASL_MECHS: { [key: string]: SASL.MechClass } = {
    anonymous: SASL.Anonymous,
    'digest-md5': SASL.DigestMD5,
    external: SASL.External,
    plain: SASL.Plain,
    'scram-sha-1': SASL.ScramSha1,
    'x-oauth2': SASL.XOauth2
};

export default class Client extends WildEmitter {
    public jid: string;
    public config!: AgentConfig;
    public sm: StreamManagement;
    public transport?: Transport;
    public stanzas: JXT.Registry;
    public sessionStarted?: boolean;
    public transports: {
        [key: string]: new (sm: StreamManagement, registry: JXT.Registry) => Transport;
    };
    public sasl!: SASL.Factory;

    constructor(opts: AgentConfig = {}) {
        super();

        this._initConfig(opts);

        this.jid = '';
        this.stanzas = new JXT.Registry();
        this.stanzas.define(Protocol);

        this.use(HostMeta);
        this.use(Features);
        this.use(SASLPlugin);
        this.use(Smacks);
        this.use(Bind);
        this.use(Session);

        this.sm = new StreamManagement((this as unknown) as Agent);
        this.transports = {
            bosh: BOSH,
            websocket: WebSocket
        };

        this.on('stream:data', (json: any, kind: string) => {
            this.emit(kind, json);
            if (kind === 'message' || kind === 'presence' || kind === 'iq') {
                this.sm.handle();
                this.emit('stanza', json);
            } else if (kind === 'sm') {
                if (json.type === 'ack') {
                    this.sm.process(json);
                }
                if (json.type === 'request') {
                    this.sm.ack();
                }
                return;
            }

            if (json.id) {
                this.emit(kind + ':id:' + json.id, json);
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

        this.on('iq', (iq: IQ) => {
            const iqType = iq.type;
            const payloadType = iq.payloadType;
            const iqEvent = 'iq:' + iqType + ':' + payloadType;

            if (iqType === 'get' || iqType === 'set') {
                if (payloadType === 'invalid-payload-count') {
                    return this.sendIQError(iq, {
                        error: {
                            condition: 'bad-request',
                            type: 'modify'
                        }
                    });
                }
                if (
                    payloadType === 'unknown-payload' ||
                    !this.callbacks[iqEvent] ||
                    !this.callbacks[iqEvent].length
                ) {
                    return this.sendIQError(iq, {
                        error: {
                            condition: 'service-unavailable',
                            type: 'cancel'
                        }
                    });
                }

                this.emit(iqEvent, iq);
            }
        });

        this.on('message', (msg: Message) => {
            const isChat =
                (msg.alternateLanguageBodies && msg.alternateLanguageBodies.length) ||
                (msg.links && msg.links.length);
            const isMarker = msg.marker && msg.marker.type !== 'markable';

            if (isChat && !isMarker) {
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

        this.on('presence', (pres: Presence) => {
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

    public use(
        pluginInit: boolean | ((agent: Agent, registry: JXT.Registry, config: AgentConfig) => void)
    ) {
        if (typeof pluginInit !== 'function') {
            return;
        }
        pluginInit((this as unknown) as Agent, this.stanzas, this.config);
    }

    public nextId() {
        return uuid();
    }

    public async getCredentials() {
        return this._getConfiguredCredentials();
    }

    public async connect(
        opts?: AgentConfig,
        transInfo?: { name?: string; url?: string }
    ): Promise<void> {
        this._initConfig(opts);
        if (!transInfo && this.config.transports && this.config.transports.length === 1) {
            transInfo = {};
            transInfo.name = this.config.transports[0];
        }
        if (transInfo && transInfo.name) {
            const trans = (this.transport = new this.transports[transInfo.name](
                this.sm,
                this.stanzas
            ));
            trans.on('*', (event: string, ...data: any[]) => {
                this.emit(event, ...data);
            });
            return trans.connect({
                acceptLanguages: this.config.acceptLanguages || ['en'],
                jid: this.config.jid!,
                lang: this.config.lang || 'en',
                server: this.config.server!,
                url:
                    (transInfo.name === 'websocket' ? this.config.wsURL : this.config.boshURL) || ''
            });
        }

        try {
            const endpoints = await ((this as unknown) as Agent).discoverBindings(
                this.config.server!
            );
            for (const transport of this.config.transports || []) {
                for (let i = 0, len = (endpoints[transport] || []).length; i < len; i++) {
                    const uri = endpoints[transport][i];
                    if (uri.indexOf('wss://') === 0 || uri.indexOf('https://') === 0) {
                        if (transport === 'websocket') {
                            this.config.wsURL = uri;
                        } else {
                            this.config.boshURL = uri;
                        }
                        return this.connect(
                            undefined,
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
        } catch (err) {
            console.error(
                'Could not find https://' +
                    this.config.server +
                    '/.well-known/host-meta file to discover connection endpoints for the requested transports.',
                err
            );
            return this.disconnect();
        }
    }

    public disconnect() {
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

    public send(name: string, data: object) {
        this.sm.track(name, data);
        if (this.transport) {
            this.transport.send(name, data);
        }
    }

    public sendMessage(data: Message) {
        const msg = {
            id: this.nextId(),
            ...data
        };
        this.emit('message:sent', msg);
        this.send('message', msg);
        return msg.id;
    }

    public sendPresence(data: Presence) {
        const pres = {
            id: this.nextId(),
            ...data
        };
        this.send('presence', pres);
        return pres.id;
    }

    public sendIQ(data: IQ & { type: 'get' | 'set' }): Promise<IQ> {
        const iq = {
            id: this.nextId(),
            ...data
        };

        const allowed = JID.allowedResponders(this.jid, data.to);
        const respEvent = 'iq:id:' + iq.id;
        const request = new Promise<IQ>((resolve, reject) => {
            const handler = (res: IQ) => {
                // Only process result from the correct responder
                if (!allowed.has(res.from)) {
                    return;
                }
                // Only process result or error responses, if the responder
                // happened to send us a request using the same ID value at
                // the same time.
                if (res.type !== 'result' && res.type !== 'error') {
                    return;
                }
                this.off(respEvent, handler);
                if (res.type === 'result') {
                    resolve(res);
                } else {
                    reject(res);
                }
            };
            this.on(respEvent, handler);
        });

        this.send('iq', iq);

        return timeoutPromise(request, (this.config.timeout || 15) * 1000, () => ({
            error: {
                condition: 'timeout'
            },
            id: iq.id,
            type: 'error'
        }));
    }

    public sendIQResult(original: IQ, reply: Partial<IQ>): void {
        this.send('iq', {
            ...reply,
            id: original.id,
            to: original.from,
            type: 'result'
        });
    }

    public sendIQError(original: IQ, error: Partial<IQ>): void {
        this.send('iq', {
            ...error,
            id: original.id,
            to: original.from,
            type: 'error'
        });
    }

    public sendStreamError(error: StreamError) {
        this.emit('stream:error', error);
        this.send('error', error);
        this.disconnect();
    }

    private _getConfiguredCredentials() {
        const creds = this.config.credentials || {};
        const requestedJID = JID.parse(this.config.jid || '');
        const username = creds.username || requestedJID.local;
        const server = creds.server || requestedJID.domain;
        return {
            host: server,
            password: this.config.password,
            realm: server,
            server,
            serviceName: server,
            serviceType: 'xmpp',
            username,
            ...creds
        };
    }

    private _initConfig(opts: AgentConfig = {}) {
        const currConfig = this.config || {};
        this.config = {
            jid: '',
            sasl: ['external', 'scram-sha-1', 'digest-md5', 'plain', 'anonymous'],
            transports: ['websocket', 'bosh'],
            useStreamManagement: true,
            ...currConfig,
            ...opts
        };

        // Enable SASL authentication mechanisms (and their preferred order)
        // based on user configuration.
        if (this.config.sasl && !Array.isArray(this.config.sasl)) {
            this.config.sasl = [this.config.sasl];
        }
        this.sasl = new SASL.Factory();
        for (const mech of this.config.sasl || []) {
            if (typeof mech === 'string') {
                const existingMech = SASL_MECHS[mech.toLowerCase()];
                if (existingMech && existingMech.prototype && existingMech.prototype.name) {
                    this.sasl.use(existingMech);
                }
            } else {
                this.sasl.use(mech);
            }
        }

        if (!this.config.server) {
            this.config.server = JID.getDomain(this.config.jid!);
        }
        if (this.config.password) {
            this.config.credentials = this.config.credentials || {};
            this.config.credentials.password = this.config.password;
            delete this.config.password;
        }
        if (this.config.transport) {
            this.config.transports = [this.config.transport];
        }
        if (this.config.transports && !Array.isArray(this.config.transports)) {
            this.config.transports = [this.config.transports];
        }
    }
}
