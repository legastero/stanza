import * as async from 'async';
import WildEmitter from 'wildemitter';

import WSNode from 'ws';
import { parse, Registry, XMLElement } from '../jxt';
import StreamManagement from '../StreamManagement';

let WS: typeof WSNode | typeof WebSocket;
if (typeof WSNode !== 'function') {
    WS = WebSocket;
} else {
    WS = WSNode;
}
const WS_OPEN = 1;

export default class WSConnection extends WildEmitter {
    public hasStream?: boolean;
    public stream?: any;

    private config: any;
    private sm: StreamManagement;
    private stanzas: Registry;
    private closing: boolean;
    private sendQueue: async.AsyncQueue<string>;
    private conn?: WSNode | WebSocket;

    constructor(sm: StreamManagement, stanzas: Registry) {
        super();

        this.sm = sm;
        this.stanzas = stanzas;
        this.closing = false;

        this.sendQueue = async.queue((data, cb) => {
            if (this.conn) {
                data = Buffer.from(data, 'utf8').toString();
                this.emit('raw:outgoing', data);
                if (this.conn.readyState === WS_OPEN) {
                    this.conn.send(data);
                }
            }
            cb();
        }, 1);

        this.on('connected', () => {
            this.send(this.startHeader());
        });

        this.on('raw:incoming', (data: string) => {
            data = data.trim();
            if (data === '') {
                return;
            }

            let xml: XMLElement;
            try {
                xml = parse(data, {
                    allowComments: false
                });
            } catch (e) {
                const err = {
                    error: {
                        condition: 'invalid-xml'
                    }
                };
                this.emit('stream:error', err, e);
                this.send(stanzas.export('error', err)!.toString());
                return this.disconnect();
            }

            const name = stanzas.getImportKey(xml);
            const stanzaObj = stanzas.import(xml, {
                acceptLanguages: [this.config.lang || 'en'],
                lang: this.stream ? this.stream.lang : this.config.lang || 'en'
            });

            if (!stanzaObj) {
                return;
            }
            if (name === 'stream') {
                if (stanzaObj.type === 'open') {
                    this.hasStream = true;
                    this.stream = stanzaObj;
                    return this.emit('stream:start', stanzaObj);
                }
                if (stanzaObj.type === 'close') {
                    this.emit('stream:end');
                    return this.disconnect();
                }
            }
            this.emit('stream:data', stanzaObj, name);
        });
    }

    public connect(opts: any) {
        this.config = opts;
        this.hasStream = false;
        this.closing = false;
        this.conn = new WS(opts.wsURL, 'xmpp');
        this.conn.onerror = (e: any) => {
            if (e.preventDefault) {
                e.preventDefault();
            }
            this.emit('disconnected');
        };
        this.conn.onclose = () => {
            this.emit('disconnected');
        };
        this.conn.onopen = () => {
            this.sm.started = false;
            this.emit('connected');
        };
        this.conn.onmessage = (wsMsg: any) => {
            this.emit('raw:incoming', Buffer.from(wsMsg.data, 'utf8').toString());
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
                this.sendQueue.push(output.toString());
            }
        } else {
            this.sendQueue.push(dataOrName);
        }
    }

    public restart() {
        this.hasStream = false;
        this.send(this.startHeader());
    }

    private startHeader() {
        const header = this.stanzas.export('stream', {
            action: 'open',
            lang: this.config.lang || 'en',
            to: this.config.server,
            version: this.config.version || '1.0'
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
