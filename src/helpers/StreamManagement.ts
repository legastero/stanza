import { nextTick } from 'async';
import { EventEmitter } from 'events';

import {
    IQ,
    Message,
    Presence,
    StreamManagementAck,
    StreamManagementEnabled,
    StreamManagementFailed,
    StreamManagementResume
} from '../protocol';

const MAX_SEQ = Math.pow(2, 32);
const mod = (v: number, n: number) => ((v % n) + n) % n;

type Unacked = ['message', Message] | ['presence', Presence] | ['iq', IQ];

interface SMState {
    handled: number;
    id?: string;
    jid?: string;
    lastAck: number;
    unacked: Unacked[];
}

export default class StreamManagement extends EventEmitter {
    public id?: string;
    public jid?: string;
    public allowResume: boolean = true;
    public lastAck: number = 0;
    public handled: number = 0;
    public unacked: Unacked[] = [];

    private pendingRequest: boolean = false;
    private inboundStarted: boolean = false;
    private outboundStarted: boolean = false;
    private cacheHandler: (state: SMState) => Promise<void> | void;

    constructor() {
        super();
        this.id = undefined;
        this.jid = undefined;
        this.allowResume = true;
        this.started = false;
        this.cacheHandler = () => undefined;
        this._reset();
    }

    get started() {
        return this.outboundStarted && this.inboundStarted;
    }

    set started(value) {
        if (!value) {
            this.outboundStarted = false;
            this.inboundStarted = false;
        }
    }

    public load(opts: SMState): void {
        this.id = opts.id;
        this.allowResume = true;
        this.handled = opts.handled;
        this.lastAck = opts.lastAck;
        this.unacked = opts.unacked;

        this.emit('prebound', opts.jid);
    }

    public cache(handler: (data: SMState) => void) {
        this.cacheHandler = handler;
    }

    public async bind(jid: string) {
        this.jid = jid;
        await this._cache();
    }

    public async enable() {
        this.emit('send', {
            allowResumption: this.allowResume,
            type: 'enable'
        });
        this.handled = 0;
        this.outboundStarted = true;

        await this._cache();
    }

    public async resume() {
        this.emit('send', {
            handled: this.handled,
            previousSession: this.id!,
            type: 'resume'
        });
        this.outboundStarted = true;

        await this._cache();
    }

    public async enabled(resp: StreamManagementEnabled) {
        this.id = resp.id;
        this.handled = 0;
        this.inboundStarted = true;

        await this._cache();
    }

    public async resumed(resp: StreamManagementResume) {
        this.id = resp.previousSession;
        this.inboundStarted = true;

        this.process(resp, true);

        await this._cache();
    }

    public async failed(resp: StreamManagementFailed) {
        // Resumption might fail, but the server can still tell us how far
        // the old session progressed.
        this.process(resp);

        // We alert that any remaining unacked stanzas failed to send. It has
        // been too long for auto-retrying these to be the right thing to do.
        for (const [kind, stanza] of this.unacked) {
            this.emit('failed', { kind, stanza } as any);
        }

        this._reset();
        await this._cache();
    }

    public ack() {
        this.emit('send', {
            handled: this.handled,
            type: 'ack'
        });
    }

    public request() {
        if (this.pendingRequest) {
            return;
        }
        this.pendingRequest = true;
        nextTick(() => {
            this.pendingRequest = false;
            this.emit('send', {
                type: 'request'
            });
        });
    }

    public async process(
        ack: StreamManagementAck | StreamManagementResume | StreamManagementFailed,
        resend: boolean = false
    ) {
        if (ack.handled === undefined) {
            return;
        }

        const numAcked = mod(ack.handled - this.lastAck, MAX_SEQ);
        for (let i = 0; i < numAcked && this.unacked.length > 0; i++) {
            const [kind, stanza] = this.unacked.shift()!;
            this.emit('acked', { kind, stanza } as any);
        }
        this.lastAck = ack.handled;

        if (resend) {
            const resendUnacked = this.unacked;
            this.unacked = [];
            for (const [kind, stanza] of resendUnacked) {
                this.emit('resend', { kind, stanza } as any);
            }
        }

        await this._cache();
    }

    public async track(kind: string, stanza: Message | Presence | IQ) {
        if (kind !== 'message' && kind !== 'presence' && kind !== 'iq') {
            return;
        }

        if (this.outboundStarted) {
            this.unacked.push([kind, stanza] as Unacked);
            await this._cache();
            this.request();
        }
    }

    public async handle() {
        if (this.inboundStarted) {
            this.handled = mod(this.handled + 1, MAX_SEQ);
            await this._cache();
        }
    }

    private async _cache() {
        await this.cacheHandler({
            handled: this.handled,
            id: this.id,
            jid: this.jid,
            lastAck: this.lastAck,
            unacked: this.unacked
        });
    }

    private _reset() {
        this.id = '';
        this.inboundStarted = false;
        this.outboundStarted = false;
        this.lastAck = 0;
        this.handled = 0;
        this.unacked = [];
    }
}
