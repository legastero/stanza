import { Duplex } from 'readable-stream';
import net from 'net';
import tls, { TLSSocket } from 'tls';

import { Agent, Transport, TransportConfig } from '../';
import { StreamErrorCondition } from '../Constants';
import StreamManagement from '../helpers/StreamManagement';
import { Stream, StreamFeatures } from '../protocol';

import { JSONData, ParsedData, Registry, StreamParser } from '../jxt';
import features from '../plugins/features';

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
    private isSecure: boolean;

    constructor(client: Agent, sm: StreamManagement, stanzas: Registry) {
        super({ objectMode: true });
        this.client = client;
        this.sm = sm;
        this.stanzas = stanzas;
        this.isSecure = false;

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
    
        this.parser.on('data', async (e: ParsedData) => {
            const name = e.kind;
            const stanzaObj = e.stanza;
            if (name === 'stream') {
                if (stanzaObj.action === 'open') {
                    this.hasStream = true;
                    this.stream = stanzaObj;
                    return this.client.emit('session:prebind', this.config.jid);
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
                    try {
                        await this.negotiateTls();
                    } catch (e) {
                        this.client.emit('--transport-error', e as Error);
                    }
                } else if (stanzaObj.type === 'failure') {
                    this.client.emit('--transport-error', new Error('TLS negotiation failed'));
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

    async discoverBindings(server: string): Promise<[TransportConfig]> {
        return [
            { url: server + ':5222' } as TransportConfig
        ];
    }

    public async connect(opts: TransportConfig): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            this.config = opts;
            this.hasStream = false;
            
            this.initParser();
            
            let host: string = this.config.url!.split(':')[0];
            let port: number = this.config.port || parseInt(this.config.url!.split(':')![1] || '-1');
            
            if (port < 0 || port > 65535) {
                console.error('Invalid or nonexistent port');
                return;
            }
            
            if (port === 5223 || this.config.directTLS) {
                port ||= 5223;
                
                // direct TLS connection
                this.socket = net.connect({ host, port }, async () => {
                    this.emit('connect');
                    this.client.emit('connected');
                    try {
                        await this.negotiateTls();
                    } catch (e) {
                        this.client.emit('--transport-error', e as Error);
                    }
                });
            } else {
                // STARTTLS or unsecure connection
                this.socket = net.connect({ host, port }, async () => {
                    this.emit('connect');
                    this.client.emit('connected');
                    this.openStream();
                });
                
                const handleFeatures = (features: StreamFeatures) => {
                    if (!('tls' in features)) {
                        if (this.client.config.requireSecureTransport && !this.isSecure) {
                            this.client.emit('--transport-error', new Error('failed to connect - STARTLS not offered'));
                            this.client.off('features', handleFeatures);
                        } else {
                            this.client.emit('stream:start', {});
                            this.client.emit('--transport-connected');
                            this.client.off('features', handleFeatures);
                        }
                    }
                };

                this.client.on('features', handleFeatures);
                this.client.once('--transport-connected', () => resolve());
                this.client.once('--transport-error', e => reject(e));
                this.socket.on('data', packet => this.parser!.write(packet.toString('utf8')));
            }
        });
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

    private async negotiateTls(): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            this.tlssocket = tls.connect({
                socket: this.socket!,
                checkServerIdentity: (host: string, cert: tls.PeerCertificate): Error | undefined => {
                    if (!this.config.pubkey) return undefined;
                    if (Buffer.compare((cert as any).pubkey, this.config.pubkey!) !== 0) {
                        return new Error('failed to connect - invalid certificate');
                    }
                    return undefined;
                }
            });
            this.initParser();
            this.tlssocket.on('secureConnect', () => {
                this.openStream();
                this.isSecure = true;
            });
            this.tlssocket.on('data', chunk => {
                const data = chunk.toString('utf8');
                this.client.emit('raw', 'incoming', data);
                this.parser!.write(data);
            });
            this.tlssocket.once('data', () => {
                this.client.emit('stream:start', {});
                this.client.emit('--transport-connected');
                resolve();
            });
            this.tlssocket.on('error', e => {
                this.tlssocket!.destroy();
                reject(e);
            });
        });
    }
}