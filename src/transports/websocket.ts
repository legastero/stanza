import { Duplex } from 'readable-stream';
import { WebSocket } from 'stanza-shims';

import { Agent, Transport, TransportConfig } from '../';
import { StreamErrorCondition } from '../Constants';
import StreamManagement from '../helpers/StreamManagement';
import { JSONData, ParsedData, Registry, StreamParser } from '../jxt';
import { Stream } from '../protocol';

const WS_OPEN = 1;

export default class WSConnection extends Duplex implements Transport {
    public hasStream?: boolean;
    public stream?: Stream;

    private client: Agent;
    private config!: TransportConfig;
    private sm: StreamManagement;
    private stanzas: Registry;
    private closing: boolean;
    private parser?: StreamParser;
    private socket?: WebSocket;

    constructor(client: Agent, sm: StreamManagement, stanzas: Registry) {
        super({ objectMode: true });
        this.sm = sm;
        this.stanzas = stanzas;
        this.closing = false;
        this.client = client;

        this.on('data', e => {
            this.client.emit('stream:data', e.stanza, e.kind);
        });

        this.on('error', () => {
            this.end();
        });

        this.on('end', () => {
            if (this.client.transport === this) {
                this.client.emit('--transport-disconnected');
            }
        });
    }

    public _read(): void {
        return;
    }

    public _write(chunk: string, encoding: string, done: (err?: Error) => void): void {
        if (!this.socket || this.socket.readyState !== WS_OPEN) {
            return done(new Error('Socket closed'));
        }

        const data = Buffer.from(chunk, 'utf8').toString();
        this.client.emit('raw', 'outgoing', data);
        this.socket.send(data);
        done();
    }

    public connect(opts: TransportConfig): void {
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

            this.push({ kind: e.kind, stanza: e.stanza });
        });

        this.parser.on('error', (err: any) => {
            const streamError = {
                condition: StreamErrorCondition.InvalidXML
            };
            this.client.emit('stream:error', streamError, err);
            this.write(this.stanzas.export('error', streamError)!.toString());
            return this.disconnect();
        });

        this.socket = new WebSocket(opts.url, 'xmpp');
        this.socket.onopen = () => {
            this.emit('connect');
            this.sm.started = false;
            this.client.emit('connected');
            this.write(this.startHeader());
        };
        this.socket.onmessage = wsMsg => {
            const data = Buffer.from(wsMsg.data as string, 'utf8').toString();
            this.client.emit('raw', 'incoming', data);
            if (this.parser) {
                this.parser.write(data);
            }
        };
        this.socket.onclose = () => {
            this.push(null);
        };
    }

    public disconnect(clean = true): void {
        if (this.socket && !this.closing && this.hasStream && clean) {
            this.closing = true;
            this.write(this.closeHeader());
        } else {
            this.hasStream = false;
            this.stream = undefined;
            if (this.socket) {
                this.end();
                this.socket.close();
                if (this.client.transport === this) {
                    this.client.emit('--transport-disconnected');
                }
            }
            this.socket = undefined;
        }
    }

    public async send(dataOrName: string, data?: JSONData): Promise<void> {
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

    public restart(): void {
        this.hasStream = false;
        this.write(this.startHeader());
    }

    private startHeader(): string {
        const header = this.stanzas.export('stream', {
            action: 'open',
            lang: this.config.lang,
            to: this.config.server,
            version: '1.0'
        })!;
        return header.toString();
    }

    private closeHeader(): string {
        const header = this.stanzas.export('stream', {
            action: 'close'
        })!;
        return header.toString();
    }
}
