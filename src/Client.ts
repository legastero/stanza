import { AsyncPriorityQueue, priorityQueue } from 'async';
import { EventEmitter } from 'events';

import { Agent, AgentConfig, Transport } from './';
import StreamManagement from './helpers/StreamManagement';
import * as JID from './JID';
import * as JXT from './jxt';
import * as SASL from './lib/sasl';
import { core as corePlugins } from './plugins';
import Protocol, { IQ, Message, Presence, StreamError } from './protocol';
import BOSH from './transports/bosh';
import WebSocket from './transports/websocket';
import { timeoutPromise, uuid } from './Utils';

interface StreamData {
    kind: string;
    stanza: any;
    replay?: boolean;
}

export default class Client extends EventEmitter {
    public jid: string;
    public config!: AgentConfig;
    public sm: StreamManagement;
    public transport?: Transport;
    public stanzas: JXT.Registry;
    public sessionStarted?: boolean;
    public transports: {
        [key: string]: new (
            client: Agent,
            sm: StreamManagement,
            registry: JXT.Registry
        ) => Transport;
    };
    public sasl: SASL.Factory;
    public incomingDataQueue: AsyncPriorityQueue<StreamData>;
    public outgoingDataQueue: AsyncPriorityQueue<StreamData>;

    constructor(opts: AgentConfig = {}) {
        super();
        this.setMaxListeners(100);
        // Some EventEmitter shims don't include off()
        this.off = this.removeListener;

        this.updateConfig(opts);

        this.jid = '';

        this.sasl = new SASL.Factory();
        this.sasl.register('EXTERNAL', SASL.EXTERNAL, 1000);
        this.sasl.register('SCRAM-SHA-256-PLUS', SASL.SCRAM, 350);
        this.sasl.register('SCRAM-SHA-256', SASL.SCRAM, 300);
        this.sasl.register('SCRAM-SHA-1-PLUS', SASL.SCRAM, 250);
        this.sasl.register('SCRAM-SHA-1', SASL.SCRAM, 200);
        this.sasl.register('DIGEST-MD5', SASL.DIGEST, 100);
        this.sasl.register('OAUTHBEARER', SASL.OAUTH, 100);
        this.sasl.register('X-OAUTH2', SASL.PLAIN, 50);
        this.sasl.register('PLAIN', SASL.PLAIN, 1);
        this.sasl.register('ANONYMOUS', SASL.ANONYMOUS, 0);

        this.stanzas = new JXT.Registry();
        this.stanzas.define(Protocol);
        this.use(corePlugins);

        this.sm = new StreamManagement();
        if (this.config.allowResumption !== undefined) {
            this.sm.allowResume = this.config.allowResumption;
        }
        this.sm.on('prebound', jid => {
            this.jid = jid;
            this.emit('session:bound', jid);
        });
        this.on('session:bound', jid => this.sm.bind(jid));

        this.sm.on('send', sm => this.send('sm', sm));
        this.sm.on('acked', acked => this.emit('stanza:acked', acked));
        this.sm.on('failed', failed => this.emit('stanza:failed', failed));
        this.sm.on('hibernated', data => this.emit('stanza:hibernated', data));

        // We disable outgoing processing while stanza resends are queued up
        // to prevent any interleaving.
        this.sm.on('begin-resend', () => this.outgoingDataQueue.pause());
        this.sm.on('resend', ({ kind, stanza }) => this.send(kind, stanza, true));
        this.sm.on('end-resend', () => this.outgoingDataQueue.resume());

        // Create message:* flavors of stanza:* SM events
        for (const type of ['acked', 'hibernated', 'failed']) {
            this.on(`stanza:${type}`, (data: StreamData) => {
                if (data.kind === 'message') {
                    this.emit(`message:${type}`, data.stanza);
                }
            });
        }

        this.transports = {
            bosh: BOSH,
            websocket: WebSocket
        };

        this.incomingDataQueue = priorityQueue<StreamData>(async (task, done) => {
            const { kind, stanza } = task;
            this.emit(kind as any, stanza);
            if (stanza.id) {
                this.emit((kind + ':id:' + stanza.id) as any, stanza);
            }

            if (kind === 'message' || kind === 'presence' || kind === 'iq') {
                this.emit('stanza', stanza);
                await this.sm.handle();
            } else if (kind === 'sm') {
                if (stanza.type === 'ack') {
                    await this.sm.process(stanza);
                    this.emit('stream:management:ack', stanza);
                }
                if (stanza.type === 'request') {
                    this.sm.ack();
                }
            }

            if (done) {
                done();
            }
        }, 1);

        this.outgoingDataQueue = priorityQueue<StreamData>(async (task, done) => {
            const { kind, stanza, replay } = task;
            const ackRequest = replay || (await this.sm.track(kind, stanza));

            if (kind === 'message') {
                if (replay) {
                    this.emit('message:retry', stanza);
                } else {
                    this.emit('message:sent', stanza, false);
                }
            }

            try {
                if (!this.transport) {
                    throw new Error('Missing transport');
                }
                await this.transport.send(kind, stanza);
                if (ackRequest) {
                    this.transport?.send('sm', { type: 'request' });
                }
            } catch (err) {
                if (!this.sm.started && ['message', 'presence', 'iq'].includes(kind)) {
                    this.emit('stanza:failed', {
                        kind,
                        stanza
                    });
                }
            }

            if (done) {
                done();
            }
        }, 1);

        this.on('stream:data' as any, (json: any, kind: string) => {
            this.incomingDataQueue.push(
                {
                    kind,
                    stanza: json
                },
                0
            );
        });

        this.on('--transport-disconnected', async () => {
            if (this.transport) {
                delete this.transport;
            }

            const drains: Array<Promise<void>> = [];
            if (!this.incomingDataQueue.idle()) {
                drains.push(this.incomingDataQueue.drain());
            }
            if (!this.outgoingDataQueue.idle()) {
                drains.push(this.outgoingDataQueue.drain());
            }
            await Promise.all(drains);

            await this.sm.hibernate();

            this.emit('--reset-stream-features');
            this.emit('disconnected');
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
                if (payloadType === 'unknown-payload' || this.listenerCount(iqEvent) === 0) {
                    return this.sendIQError(iq, {
                        error: {
                            condition: 'service-unavailable',
                            type: 'cancel'
                        }
                    });
                }

                this.emit(iqEvent as any, iq);
            }
        });

        this.on('message', msg => {
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
            this.emit(presType as any, pres);
        });
    }

    public updateConfig(opts: AgentConfig = {}) {
        const currConfig = this.config || {};
        this.config = {
            allowResumption: true,
            jid: '',
            transports: {
                bosh: true,
                websocket: true
            },
            useStreamManagement: true,
            ...currConfig,
            ...opts
        };

        if (!this.config.server) {
            this.config.server = JID.getDomain(this.config.jid!);
        }
        if (this.config.password) {
            this.config.credentials = this.config.credentials || {};
            this.config.credentials.password = this.config.password;
            delete this.config.password;
        }
    }

    get stream() {
        return this.transport ? this.transport.stream : undefined;
    }

    public emit(name: string, ...args: any[]): boolean {
        // Continue supporting the most common and useful wildcard events
        const res = super.emit(name, ...args);
        if (name === 'raw') {
            super.emit(`raw:${args[0]}`, args[1]);
            super.emit('raw:*', `raw:${args[0]}`, args[1]);
            super.emit('*', `raw:${args[0]}`, args[1]);
        } else {
            super.emit('*', name, ...args);
        }
        return res;
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

    public async getCredentials(): Promise<SASL.Credentials> {
        return this._getConfiguredCredentials();
    }

    public async connect(): Promise<void> {
        this.emit('--reset-stream-features');

        const transportPref = ['websocket', 'bosh'];
        let endpoints: { [key: string]: string[] } | undefined;
        for (const name of transportPref) {
            let conf = this.config.transports![name];
            if (!conf) {
                continue;
            }
            if (typeof conf === 'string') {
                conf = { url: conf };
            } else if (conf === true) {
                if (!endpoints) {
                    try {
                        endpoints = await ((this as unknown) as Agent).discoverBindings(
                            this.config.server!
                        );
                    } catch (err) {
                        console.error(err);
                        continue;
                    }
                }
                endpoints[name] = (endpoints[name] || []).filter(
                    url => url.startsWith('wss:') || url.startsWith('https:')
                );
                if (!endpoints[name] || !endpoints[name].length) {
                    continue;
                }
                conf = { url: endpoints[name][0] };
            }

            this.transport = new this.transports[name](
                (this as unknown) as Agent,
                this.sm,
                this.stanzas
            );
            this.transport.connect({
                acceptLanguages: this.config.acceptLanguages || ['en'],
                jid: this.config.jid!,
                lang: this.config.lang || 'en',
                server: this.config.server!,
                url: conf.url!,
                ...conf
            });
            return;
        }

        console.error('No endpoints found for the requested transports.');
        return this.disconnect();
    }

    public async disconnect() {
        this.outgoingDataQueue.pause();
        if (this.sessionStarted && !this.sm.started) {
            // Only emit session:end if we had a session, and we aren't using
            // stream management to keep the session alive.
            this.emit('session:end');
        }
        this.emit('--reset-stream-features');
        this.sessionStarted = false;
        if (this.transport) {
            this.transport.disconnect();
        } else {
            this.emit('--transport-disconnected');
        }
        this.outgoingDataQueue.resume();
        if (!this.outgoingDataQueue.idle()) {
            await this.outgoingDataQueue.drain();
        }
        await this.sm.shutdown();
    }

    public async send(kind: string, stanza: object, replay = false): Promise<void> {
        return new Promise((resolve, reject) => {
            this.outgoingDataQueue.push({ kind, stanza, replay }, replay ? 0 : 1, err =>
                err ? reject(err) : resolve()
            );
        });
    }

    public sendMessage(data: Message): string {
        const id = data.id || this.nextId();
        const msg = {
            id,
            originId: id,
            ...data
        };
        this.send('message', msg);
        return msg.id;
    }

    public sendPresence(data: Presence = {}): string {
        const pres = {
            id: this.nextId(),
            ...data
        };
        this.send('presence', pres);
        return pres.id;
    }

    public sendIQ<T extends IQ = IQ, R extends IQ = T>(data: T): Promise<R> {
        const iq = {
            id: this.nextId(),
            ...data
        };

        const allowed = JID.allowedResponders(this.jid, data.to);
        const respEvent = 'iq:id:' + iq.id;
        const request = new Promise<R>((resolve, reject) => {
            const handler = (res: R) => {
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
                this.off(respEvent as any, handler);
                if (res.type === 'result') {
                    resolve(res);
                } else {
                    reject(res);
                }
            };
            this.on(respEvent as any, handler);
        });

        this.send('iq', iq);

        return timeoutPromise<R>(request, (this.config.timeout || 15) * 1000, () => ({
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

    private _getConfiguredCredentials(): SASL.Credentials {
        const creds = this.config.credentials || {};
        const requestedJID = JID.parse(this.config.jid || '');
        const username = creds.username || requestedJID.local;
        const server = creds.host || requestedJID.domain;
        return {
            host: server,
            password: this.config.password,
            realm: server,
            serviceName: server,
            serviceType: 'xmpp',
            username,
            ...creds
        };
    }
}
