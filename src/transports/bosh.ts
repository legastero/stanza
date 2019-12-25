import { fetch } from 'stanza-shims';

import { Agent, Transport, TransportConfig } from '../';
import { StreamErrorCondition } from '../Constants';
import StreamManagement from '../helpers/StreamManagement';
import { ParsedData, Registry, StreamParser } from '../jxt';
import { BOSH, Stream } from '../protocol';
import { sleep, timeoutPromise } from '../Utils';

async function retryRequest(
    url: string,
    opts: RequestInit,
    timeout: number,
    allowedRetries: number = 5
): Promise<string> {
    let attempt = 0;
    while (attempt <= allowedRetries) {
        try {
            const resp = await timeoutPromise(fetch(url, opts), timeout * 1000, () => {
                return new Error('Request timed out');
            });
            if (!resp.ok) {
                throw new Error('HTTP Status Error: ' + resp.status);
            }
            return resp.text();
        } catch (err) {
            attempt += 1;
            if (attempt > allowedRetries) {
                throw err;
            }
        }

        await sleep(Math.pow(attempt, 2) * 1000);
    }

    throw new Error('Request failed');
}

export default class BOSHConnection implements Transport {
    public hasStream?: boolean;
    public stream?: Stream;
    public authenticated?: boolean;

    public sid?: string;
    public rid?: number;

    private client: Agent;
    private config!: TransportConfig;
    private url?: string;
    private sm: StreamManagement;
    private stanzas: Registry;
    private closing?: boolean;
    private sendBuffer: string[];
    private requests: Set<number>;

    private maxRequests: number = 2;
    private maxHoldOpen: number = 1;
    private minPollingInterval: number = 5;

    private pollingInterval: any;
    private idleTimeout: any;
    private lastResponseTime: number;

    constructor(client: Agent, sm: StreamManagement, stanzas: Registry) {
        this.client = client;
        this.sm = sm;
        this.stanzas = stanzas;
        this.sendBuffer = [];
        this.requests = new Set();
        this.authenticated = false;
        this.lastResponseTime = Date.now();

        this.pollingInterval = setInterval(() => {
            if (
                this.authenticated &&
                this.requests.size === 0 &&
                this.sendBuffer.length === 0 &&
                Date.now() - this.lastResponseTime >= this.minPollingInterval * 1000
            ) {
                this.longPoll();
            }
        }, 1000);
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
        this.requests.clear();
        if (this.sid) {
            this.hasStream = true;
            this.stream = {};
            this.client.emit('connected');
            this.client.emit('session:prebind', this.config.jid);
            this.client.emit('session:started');
            return;
        }
        this.rid!++;
        this.request({
            lang: this.config.lang,
            maxHoldOpen: 1,
            maxWaitTime: this.config.wait,
            to: this.config.server,
            version: '1.6',
            xmppVersion: '1.0'
        });
    }

    public disconnect() {
        clearInterval(this.pollingInterval);
        if (this.hasStream) {
            this.rid!++;
            this.request({
                type: 'terminate'
            });
        } else {
            this.stream = undefined;
            this.sid = undefined;
            this.rid = undefined;
            this.client.emit('--transport-disconnected');
        }
    }

    public restart() {
        this.hasStream = false;
        this.rid!++;
        this.request({
            lang: this.config.lang,
            to: this.config.server,
            xmppRestart: true
        });
    }

    public send(dataOrName: string, data?: object): void {
        if (data) {
            const output = this.stanzas.export(dataOrName, data);
            if (output) {
                this.sendBuffer.push(output.toString());
            }
        } else {
            this.sendBuffer.push(dataOrName);
        }
        this.longPoll();
    }

    private longPoll() {
        const canReceive = !this.maxRequests || this.requests.size < this.maxRequests;
        const canSend =
            !this.maxRequests ||
            (this.sendBuffer.length > 0 && this.requests.size < this.maxRequests);

        if (!this.sid || (!canReceive && !canSend)) {
            return;
        }

        const stanzas = this.sendBuffer;
        this.sendBuffer = [];
        this.rid!++;
        this.request({}, stanzas);
    }

    private async request(meta: BOSH, payloads: string[] = []) {
        const rid = this.rid!;
        this.requests.add(rid);

        meta.rid = this.rid;
        meta.sid = this.sid;

        const bosh = this.stanzas.export('bosh', meta)!;
        const body = [bosh.openTag(), ...payloads, bosh.closeTag()].join('');

        this.client.emit('raw', 'outgoing', body);

        try {
            const respBody = await retryRequest(
                this.url!,
                {
                    body,
                    headers: {
                        'Content-Type': 'text/xml'
                    },
                    method: 'POST'
                },
                this.config.wait! * 1.1,
                this.config.maxRetries
            );
            this.requests.delete(rid);
            this.lastResponseTime = Date.now();

            if (respBody) {
                const rawData = Buffer.from(respBody, 'utf8')
                    .toString()
                    .trim();
                if (rawData === '') {
                    return;
                }
                this.client.emit('raw', 'incoming', rawData);

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
                        if (e.stanza.type === 'terminate') {
                            this.hasStream = false;
                            this.rid = undefined;
                            this.sid = undefined;
                            this.client.emit('bosh:terminate', e.stanza);
                            this.client.emit('stream:end');
                            this.client.emit('--transport-disconnected');
                            return;
                        }
                        if (!this.hasStream) {
                            this.hasStream = true;
                            this.stream = e.stanza;
                            this.sid = e.stanza.sid || this.sid;
                            this.maxHoldOpen = e.stanza.maxHoldOpen || this.maxHoldOpen;
                            this.maxRequests = e.stanza.maxRequests || this.maxRequests;
                            this.minPollingInterval =
                                e.stanza.minPollingInterval || this.minPollingInterval;

                            this.client.emit('stream:start', e.stanza);
                        }
                        return;
                    }
                    if (!e.event) {
                        this.client.emit('stream:data', e.stanza, e.kind);
                    }
                });

                parser.write(rawData);
            }

            if (meta.type === 'terminate') {
                this.closing = true;
            }

            // do not (re)start long polling if terminating, or request is pending, or before authentication
            if (
                this.hasStream &&
                !this.closing &&
                this.authenticated &&
                (!this.requests.size || this.sendBuffer.length)
            ) {
                clearTimeout(this.idleTimeout);
                this.idleTimeout = setTimeout(() => {
                    this.longPoll();
                }, 100);
            }
        } catch (err) {
            this.hasStream = false;
            this.client.emit(
                'stream:error',
                {
                    condition: 'connection-timeout'
                },
                err
            );
            this.disconnect();
        }
    }
}
