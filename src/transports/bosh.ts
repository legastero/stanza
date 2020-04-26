import { Duplex } from 'readable-stream';
import { fetch } from 'stanza-shims';

import { Agent, Transport, TransportConfig } from '../';
import { StreamErrorCondition } from '../Constants';
import StreamManagement from '../helpers/StreamManagement';
import { Stream } from '../protocol';

import { ParsedData, Registry, StreamParser } from '../jxt';

import { sleep, timeoutPromise } from '../Utils';

class RequestChannel {
    public rid!: number;
    public maxTimeout: number;
    public active: boolean = false;

    private stream: BOSH;
    private maxRetries: number = 5;

    constructor(stream: BOSH) {
        this.stream = stream;
        this.maxTimeout = 1000 * 1.1 * this.stream.maxWaitTime;
    }

    public async send(rid: number, body: string): Promise<string> {
        this.rid = rid;
        this.active = true;
        let attempts = 0;

        while (attempts <= this.maxRetries) {
            attempts += 1;

            try {
                const res = await timeoutPromise(
                    fetch(this.stream.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': this.stream.contentType
                        },
                        body
                    }),
                    this.maxTimeout,
                    () => new Error('Request timed out')
                );
                if (!res.ok) {
                    throw new Error('HTTP Status Error: ' + res.status);
                }

                const result = await res.text();
                this.active = false;

                return result;
            } catch (err) {
                if (attempts === 1) {
                    continue;
                } else if (attempts < this.maxRetries) {
                    const backoff = Math.min(this.maxTimeout, Math.pow(attempts, 2) * 1000);
                    await sleep(backoff + Math.random() * 1000);
                    continue;
                } else {
                    this.active = false;
                    throw err;
                }
            }
        }

        throw new Error('Request failed');
    }
}

export default class BOSH extends Duplex implements Transport {
    public hasStream?: boolean;
    public stream?: Stream;
    public authenticated?: boolean;

    private client: Agent;
    private config!: TransportConfig;
    private sm: StreamManagement;
    private stanzas: Registry;

    public url!: string;
    public rid?: number = Math.floor(Math.random() * 0xffffffff);
    public sid?: string = '';

    public maxHoldOpen: number = 2;
    public maxWaitTime: number = 30;

    public contentType: string = 'text/xml; charset=utf-8';

    private idleTimeout: any;
    private queue: Array<[any, (err?: Error) => void]> = [];

    private isEnded: boolean = false;

    public channels: RequestChannel[] = [new RequestChannel(this), new RequestChannel(this)];
    public activeChannelID = 0;

    constructor(client: Agent, sm: StreamManagement, stanzas: Registry) {
        super({
            objectMode: true
        });

        this.client = client;
        this.sm = sm;
        this.stanzas = stanzas;

        this.on('data', e => {
            this.client.emit('stream:data', e.stanza, e.kind);
        });

        this.on('end', () => {
            this.isEnded = true;
            clearTimeout(this.idleTimeout);

            this.client.emit('--transport-disconnected');
        });
    }

    public _write(chunk: any, encoding: string, done: (err?: Error) => void) {
        this.queue.push([chunk, done]);
        this.scheduleRequests();
    }

    public _writev(chunks: Array<{ chunk: any; encoding: any }>, done: (err?: Error) => void) {
        this.queue.push([chunks.map(c => c.chunk).join(''), done]);
        this.scheduleRequests();
    }

    public _read(): void {
        return;
    }

    private get sendingChannel() {
        return this.channels[this.activeChannelID];
    }

    private get pollingChannel() {
        return this.channels[this.activeChannelID === 0 ? 1 : 0];
    }

    private toggleChannel() {
        this.activeChannelID = this.activeChannelID === 0 ? 1 : 0;
    }

    public process(result: string): void {
        const parser = new StreamParser({
            acceptLanguages: this.config.acceptLanguages,
            allowComments: false,
            lang: this.config.lang,
            registry: this.stanzas,
            rootKey: 'bosh',
            wrappedStream: true
        });

        parser.on('error', (err: any) => {
            const streamError = {
                condition: StreamErrorCondition.InvalidXML
            };
            this.client.emit('stream:error', streamError, err);
            this.send('error', streamError);
            return this.disconnect();
        });

        parser.on('data', (e: ParsedData) => {
            if (e.event === 'stream-start') {
                this.stream = e.stanza;
                if (e.stanza.type === 'terminate') {
                    this.hasStream = false;
                    this.rid = undefined;
                    this.sid = undefined;
                    if (!this.isEnded) {
                        this.isEnded = true;
                        this.client.emit('bosh:terminate', e.stanza);
                        this.client.emit('stream:end');
                        this.push(null);
                    }
                } else if (!this.hasStream) {
                    this.hasStream = true;
                    this.stream = e.stanza;
                    this.sid = e.stanza.sid || this.sid;
                    this.maxWaitTime = e.stanza.maxWaitTime || this.maxWaitTime;

                    this.client.emit('stream:start', e.stanza);
                }
                return;
            }

            if (!e.event) {
                this.push({ kind: e.kind, stanza: e.stanza });
            }
        });

        this.client.emit('raw', 'incoming', result);
        parser.write(result);

        this.scheduleRequests();
    }

    public connect(opts: TransportConfig): void {
        this.config = opts;

        this.url = opts.url;
        if (opts.rid) {
            this.rid = opts.rid;
        }
        if (opts.sid) {
            this.sid = opts.sid;
        }
        if (opts.wait) {
            this.maxWaitTime = opts.wait;
        }

        if (this.sid) {
            this.hasStream = true;
            this.stream = {};
            this.client.emit('connected');
            this.client.emit('session:prebind', this.config.jid);
            this.client.emit('session:started');
            return;
        }

        this._send({
            to: opts.server,
            lang: opts.lang,
            version: '1.6',
            maxWaitTime: this.maxWaitTime,
            maxHoldOpen: this.maxHoldOpen,
            xmppVersion: '1.0'
        });
    }

    public restart(): void {
        this.hasStream = false;
        this._send({
            to: this.config.server,
            xmppRestart: true
        });
    }

    public disconnect() {
        if (this.hasStream) {
            this._send({
                type: 'terminate'
            });
        } else {
            this.stream = undefined;
            this.sid = undefined;
            this.rid = undefined;
            this.client.emit('--transport-disconnected');
        }
    }

    public async send(dataOrName: string, data?: object): Promise<void> {
        let output: string | undefined;
        if (data) {
            output = this.stanzas.export(dataOrName, data)?.toString();
        }
        if (!output) {
            return;
        }

        return new Promise<void>((resolve, reject) => {
            this.write(output, 'utf8', err => (err ? reject(err) : resolve()));
        });
    }

    private async _send(boshData: any, payload: string = ''): Promise<void> {
        if (this.isEnded) {
            return;
        }

        const rid = this.rid!++;
        const header = this.stanzas.export('bosh', {
            ...boshData,
            rid,
            sid: this.sid
        })!;
        let body: string;
        if (payload) {
            body = [header.openTag(), payload, header.closeTag()].join('');
        } else {
            body = header.toString();
        }

        this.client.emit('raw', 'outgoing', body);

        this.sendingChannel
            .send(rid, body)
            .then(result => {
                this.process(result);
            })
            .catch(err => {
                this.end(err);
            });
        this.toggleChannel();
    }

    private async _poll(): Promise<void> {
        if (this.isEnded) {
            return;
        }

        const rid = this.rid!++;
        const body = this.stanzas
            .export('bosh', {
                rid,
                sid: this.sid
            })!
            .toString();

        this.client.emit('raw', 'outgoing', body);

        this.pollingChannel
            .send(rid, body)
            .then(result => {
                this.process(result);
            })
            .catch(err => {
                this.end(err);
            });
    }

    private scheduleRequests() {
        clearTimeout(this.idleTimeout);
        this.idleTimeout = setTimeout(() => {
            this.fireRequests();
        }, 10);
    }

    private fireRequests() {
        if (this.isEnded) {
            return;
        }

        if (this.queue.length) {
            if (!this.sendingChannel.active) {
                const [data, done] = this.queue.shift()!;
                this._send({}, data);
                done();
            } else {
                this.scheduleRequests();
            }
            return;
        }

        if (this.authenticated && !(this.channels[0].active || this.channels[1].active)) {
            this._poll();
        }
    }
}
