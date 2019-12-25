import { AsyncPriorityQueue, priorityQueue } from 'async';
import { WebSocket } from 'stanza-shims';

import { Agent, Transport, TransportConfig } from '../';
import { StreamErrorCondition } from '../Constants';
import StreamManagement from '../helpers/StreamManagement';
import { ParsedData, Registry, StreamParser } from '../jxt';
import { Stream } from '../protocol';

const WS_OPEN = 1;

export default class WSConnection implements Transport {
    public hasStream?: boolean;
    public stream?: Stream;

    private client: Agent;
    private config!: TransportConfig;
    private sm: StreamManagement;
    private stanzas: Registry;
    private closing: boolean;
    private sendQueue: AsyncPriorityQueue<string>;
    private conn?: WebSocket;
    private parser?: StreamParser;

    constructor(client: Agent, sm: StreamManagement, stanzas: Registry) {
        this.sm = sm;
        this.stanzas = stanzas;
        this.closing = false;
        this.client = client;

        this.sendQueue = priorityQueue((data, cb) => {
            if (this.conn) {
                data = Buffer.from(data, 'utf8').toString();
                this.client.emit('raw', 'outgoing', data);
                if (this.conn.readyState === WS_OPEN) {
                    this.conn.send(data);
                }
            }
            cb();
        }, 1);
    }

    public connect(opts: TransportConfig) {
        this.config = opts;
        this.hasStream = false;
        this.closing = false;

        this.parser = new StreamParser({
            acceptLanguages: this.config.acceptLanguages,
            allowComments: false,
            lang: this.config.lang,
            registry: this.stanzas,
            wrappedStream: false
        });

        this.parser.on('data', (e: ParsedData) => {
            const name = e.kind;
            const stanzaObj = e.stanza;

            if (name === 'stream') {
                if (stanzaObj.action === 'open') {
                    this.hasStream = true;
                    this.stream = stanzaObj;
                    return this.client.emit('stream:start', stanzaObj);
                }
                if (stanzaObj.action === 'close') {
                    this.client.emit('stream:end');
                    return this.disconnect();
                }
            }
            this.client.emit('stream:data', stanzaObj, name);
        });

        this.parser.on('error', (err: any) => {
            const streamError = {
                condition: StreamErrorCondition.InvalidXML
            };
            this.client.emit('stream:error', streamError, err);
            this.send(this.stanzas.export('error', streamError)!.toString());
            return this.disconnect();
        });

        this.conn = new WebSocket(opts.url, 'xmpp');
        this.conn.onerror = (e: any) => {
            if (e.preventDefault) {
                e.preventDefault();
            }
            console.error(e);
        };
        this.conn.onclose = (e: any) => {
            this.client.emit('--transport-disconnected');
        };
        this.conn.onopen = () => {
            this.sm.started = false;
            this.client.emit('connected');
            this.send(this.startHeader());
        };
        this.conn.onmessage = wsMsg => {
            const data = Buffer.from(wsMsg.data as string, 'utf8').toString();
            this.client.emit('raw', 'incoming', data);
            if (this.parser) {
                this.parser.write(data);
            }
        };
    }

    public disconnect() {
        if (this.conn && !this.closing && this.hasStream) {
            this.closing = true;
            this.send(this.closeHeader());
        } else {
            this.hasStream = false;
            this.stream = undefined;
            if (this.conn && this.conn.readyState === WS_OPEN) {
                this.conn.close();
            }
            this.conn = undefined;
        }
    }

    public send(dataOrName: string, data?: object): void {
        if (data) {
            const output = this.stanzas.export(dataOrName, data);
            if (output) {
                this.sendQueue.push(output.toString(), 0);
            }
        } else {
            this.sendQueue.push(dataOrName, 0);
        }
    }

    public restart() {
        this.hasStream = false;
        this.send(this.startHeader());
    }

    private startHeader() {
        const header = this.stanzas.export('stream', {
            action: 'open',
            lang: this.config.lang,
            to: this.config.server,
            version: '1.0'
        })!;
        return header.toString();
    }

    private closeHeader() {
        const header = this.stanzas.export('stream', {
            action: 'close'
        })!;
        return header.toString();
    }
}
