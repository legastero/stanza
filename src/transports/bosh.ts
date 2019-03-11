import fetch from 'cross-fetch';
import WildEmitter from 'wildemitter';

import { Transport, TransportConfig } from '../Definitions';
import { parse, ParsedData, Registry, StreamParser, XMLElement } from '../jxt';
import { NS_BOSH } from '../protocol';
import { Stream } from '../protocol/stanzas';
import StreamManagement from '../StreamManagement';
import { timeoutPromise } from '../Utils';

async function retryRequest(
    url: string,
    opts: RequestInit,
    timeout: number,
    allowedRetries: number = 5
): Promise<string> {
    while (allowedRetries >= 0) {
        try {
            const resp = await timeoutPromise(fetch(url, opts), timeout * 1000, () => {
                return new Error('Request timed out');
            });
            if (!resp.ok) {
                throw new Error('HTTP Status Error: ' + resp.status);
            }
            return resp.text();
        } catch (err) {
            allowedRetries -= 1;
            if (allowedRetries < 0) {
                throw err;
            }
        }
    }

    throw new Error('Request failed');
}

export default class BOSHConnection extends WildEmitter implements Transport {
    public hasStream?: boolean;
    public stream?: Stream;
    public authenticated?: boolean;

    public sid?: string;
    public rid?: number;

    private config!: TransportConfig;
    private url?: string;
    private sm: StreamManagement;
    private stanzas: Registry;
    private closing?: boolean;
    private sendQueue: any[];
    private requests: any[];

    private maxRequests?: number;

    constructor(sm: StreamManagement, stanzas: Registry) {
        super();

        this.sm = sm;
        this.stanzas = stanzas;
        this.sendQueue = [];
        this.requests = [];
        this.maxRequests = undefined;
        this.sid = '';
        this.authenticated = false;

        this.on('raw:incoming', (data: string) => {
            data = data.trim();
            if (data === '') {
                return;
            }

            const parser = new StreamParser({
                acceptLanguages: this.config.acceptLanguages,
                allowComments: false,
                lang: this.config.lang,
                registry: stanzas,
                rootKey: 'bosh',
                wrappedStream: true
            });

            parser.on('error', (err: any) => {
                const streamError = {
                    condition: 'invalid-xml'
                };
                this.emit('stream:error', streamError, err);
                this.send('error', streamError);
                return this.disconnect();
            });

            parser.on('data', (e: ParsedData) => {
                if (e.event === 'stream-start') {
                    if (e.stanza.type === 'terminate') {
                        this.hasStream = false;
                        this.rid = undefined;
                        this.sid = undefined;
                        this.emit('bosh:terminate', e.stanza);
                        this.emit('stream:end');
                        this.emit('disconnected');
                        return;
                    }
                    if (!this.hasStream) {
                        this.hasStream = true;
                        this.stream = e.stanza;

                        this.sid = e.stanza.sid || this.sid;
                        this.maxRequests = e.stanza.maxRequests || this.maxRequests;

                        this.emit('stream:start', e.stanza);
                    }
                    return;
                }
                if (!e.event) {
                    this.emit('stream:data', e.stanza, e.kind);
                }
            });

            parser.write(data);
        });
    }

    public connect(opts: TransportConfig) {
        this.config = {
            maxRetries: 5,
            rid: Math.ceil(Math.random() * 9999999999),
            wait: 30,
            ...opts
        };
        this.hasStream = false;
        this.sm.started = false;
        this.url = this.config.url;
        this.sid = this.config.sid;
        this.rid = this.config.rid;
        this.requests = [];
        if (this.sid) {
            this.hasStream = true;
            this.stream = {};
            this.emit('connected', this);
            this.emit('session:prebind', this.config.jid);
            this.emit('session:started');
            return;
        }
        this.rid!++;
        this.request(
            new this.stanzas.BOSH({
                hold: 1,
                lang: this.config.lang,
                to: this.config.server,
                ver: '1.6',
                version: '1.0',
                wait: this.config.wait
            })
        );
    }

    public disconnect() {
        if (this.hasStream) {
            this.rid!++;
            this.request(
                new this.stanzas.BOSH({
                    type: 'terminate'
                })
            );
        } else {
            this.stream = undefined;
            this.sid = undefined;
            this.rid = undefined;
            this.emit('disconnected', this);
        }
    }

    public restart() {
        this.hasStream = false;
        this.rid!++;
        this.request(
            new self.stanzas.BOSH({
                lang: this.config.lang,
                restart: 'true',
                to: this.config.server
            })
        );
    }

    public send(dataOrName: string, data?: object): void {
        if (data) {
            const output = this.stanzas.export(dataOrName, data);
            if (output) {
                this.sendQueue.push(output.toString());
            }
        } else {
            this.sendQueue.push(dataOrName);
        }
    }

    private longPoll() {
        const canReceive = !this.maxRequests || this.requests.length < this.maxRequests;
        const canSend =
            !this.maxRequests ||
            (this.sendQueue.length > 0 && this.requests.length < this.maxRequests);
        if (!this.sid || (!canReceive && !canSend)) {
            return;
        }
        const stanzas = this.sendQueue;
        this.sendQueue = [];
        this.rid!++;
        this.request(
            new this.stanzas.BOSH({
                payload: stanzas
            })
        );
    }

    private async request(bosh) {
        const ticket = { id: this.rid, request: null };
        bosh.rid = this.rid;
        bosh.sid = this.sid;
        const body = Buffer.from(bosh.toString(), 'utf8').toString();
        this.emit('raw:outgoing', body);
        this.emit('raw:outgoing:' + ticket.id, body);
        this.requests.push(ticket);

        try {
            let respBody = await retryRequest(
                this.url!,
                {
                    body,
                    headers: {
                        'Content-Type': 'text/xml'
                    },
                    method: 'POST'
                },
                this.config.wait! * 1.5,
                this.config.maxRetries
            );
            this.requests = this.requests.filter(item => {
                return item.id !== ticket.id;
            });

            if (respBody) {
                respBody = Buffer.from(respBody, 'utf8').toString();
                this.emit('raw:incoming', respBody);
                this.emit('raw:incoming:' + ticket.id, respBody);
            }
            // do not (re)start long polling if terminating, or request is pending, or before authentication
            if (
                this.hasStream &&
                bosh.type !== 'terminate' &&
                !this.requests.length &&
                this.authenticated
            ) {
                setTimeout(() => {
                    this.longPoll();
                }, 30);
            }
        } catch (err) {
            console.log(err);
            this.hasStream = false;
            const serr = new this.stanzas.StreamError({
                condition: 'connection-timeout'
            });
            this.emit('stream:error', serr, err);
            this.disconnect();
        }
    }
}
