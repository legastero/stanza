import { Duplex } from 'readable-stream';
import net from 'net';
import tls, { TLSSocket } from 'tls';

import { Agent, Transport, TransportConfig } from '../';
import { StreamErrorCondition } from '../Constants';
import StreamManagement from '../helpers/StreamManagement';
import { Stream } from '../protocol';

import { JSONData, ParsedData, Registry, StreamParser } from '../jxt';

export default class TCP extends Duplex implements Transport {
    public hasStream?: boolean;
    public stream?: Stream;
    public authenticated?: boolean;

    private client: Agent;
    private config!: TransportConfig;
    private sm: StreamManagement;
    private stanzas: Registry;
    private parser!: StreamParser;

    private socket?: net.Socket;
    private tlssocket?: TLSSocket;

    constructor(client: Agent, sm: StreamManagement, stanzas: Registry) {
        super({ objectMode: true });
        this.client = client;
        this.sm = sm;
        this.stanzas = stanzas;

        this.on('data', e => {
            this.client.emit('stream:data', e.stanza, e.kind);
        });

        this.on('end', () => {
            if (this.client.transport === this) {
                this.client.emit('--transport-disconnected');
            }
        });
    }

    public initParser(): void {
        this.parser = new StreamParser({
            acceptLanguages: this.config.acceptLanguages,
            allowComments: false,
            lang: this.config.lang,
            registry: this.stanzas,
            wrappedStream: true
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
            if (name === 'features') {
                if (stanzaObj.tls) {
                    this.write(`<starttls xmlns='urn:ietf:params:xml:ns:xmpp-tls'/>`);
                }
            }
            if (name === 'tls') {
                if (stanzaObj.type === 'proceed') {
                    this.negotiateTls();
                } else if (stanzaObj.type === 'failure') {
                    this.socket?.destroy();
                    this.emit('end');
                }
            }

            this.push({ kind: e.kind, stanza: e.stanza });
        });
    
        this.parser.on('error', (err: any) => {
            const streamError = { condition: StreamErrorCondition.InvalidXML };
            this.client.emit('stream:error', streamError, err);
            this.write(this.stanzas.export('error', streamError)!.toString());
            return this.disconnect();
        });
    }

    public connect(opts: TransportConfig): void {
        this.config = opts;
        this.hasStream = false;

        this.initParser();

        const host: string = this.config.url.split(":")[0];
        const port: number = this.config.port || parseInt(this.config.url.split(":")[1]);
        
        if (port === 5223 || this.config.directTLS) {
            // direct TLS connection
            this.socket = net.connect({ host, port }, () => {
                this.emit('connect');
                this.client.emit('connected');
                this.negotiateTls();
            });
        } else {
            // STARTTLS connection
            this.socket = net.connect({ host, port }, () => {
                this.emit('connect');
                this.client.emit('connected');
                this.openStream();
            });
            this.socket.on('data', packet => this.parser!.write(packet.toString('utf8')));
        }
    }
    
    public _write(chunk: string, encoding: string, done: (err?: Error) => void): void {
        const data = Buffer.from(chunk, 'utf8').toString();
        this.client.emit('raw', 'outgoing', data);
        (this.tlssocket || this.socket)?.write(data);
        done();
    }
    
    public _read(): void { return; }
    
    public disconnect(cleanly = true): void {
        if (cleanly) this.write(`</stream:stream>`);
        setTimeout(() => {
            this.hasStream = false;
            (this.tlssocket || this.socket)?.destroy();
            this.emit('end');
        }, cleanly ? 500 : 0);
    }
    
    public restart(): void {
        this.hasStream = false;
        this.initParser();
        this.openStream();
    }
    
    public async send(name: string, data?: JSONData): Promise<void> {
        let output: string | undefined;
        if (data) {
            output = this.stanzas.export(name, data)?.toString();
        }
        if (!output) {
            return;
        }
        
        return new Promise<void>((resolve, reject) => {
            this.write(output, 'utf8', err => (err ? reject(err) : resolve()));
        });
    }
    
    private openStream(): void {
        this.write(`<?xml version='1.0'?><stream:stream from='${this.config.jid}' to='${this.config.server}' version='1.0' xml:lang='${this.config.lang}' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'>`);
    }

    private negotiateTls(): void {
        this.tlssocket = tls.connect({
            socket: this.socket!,
        });
        this.initParser();
        this.tlssocket.on('secureConnect', () => this.openStream());
        this.tlssocket.on('data', chunk => {
            const data = chunk.toString('utf8');
            this.client.emit('raw', 'incoming', data);
            this.parser!.write(data);
        });
        this.tlssocket.once('data', () => {
            this.client.emit('session:prebind', this.config.jid);
            this.client.emit('stream:start', {});
            this.client.emit('session:started');
        });
    }
}