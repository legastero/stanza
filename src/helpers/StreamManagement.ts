import { EventEmitter } from 'events';

import {
    IQ,
    Message,
    Presence,
    StreamManagementAck,
    StreamManagementEnable,
    StreamManagementEnabled,
    StreamManagementFailed,
    StreamManagementResume
} from '../protocol';

const MAX_SEQ = Math.pow(2, 32);
const mod = (v: number, n: number) => ((v % n) + n) % n;

type Unacked = ['message', Message] | ['presence', Presence] | ['iq', IQ];

interface SMState {
    allowResume: boolean;
    handled: number;
    id?: string;
    jid?: string;
    lastAck: number;
    unacked: Unacked[];
}

export default class StreamManagement extends EventEmitter {
    public id?: string;
    public jid?: string;
    public allowResume = true;
    public lastAck = 0;
    public handled = 0;
    public unacked: Unacked[] = [];

    private inboundStarted = false;
    private outboundStarted = false;
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

    get started(): boolean {
        return this.outboundStarted && this.inboundStarted;
    }

    set started(value: boolean) {
        if (!value) {
            this.outboundStarted = false;
            this.inboundStarted = false;
        }
    }

    get resumable(): boolean {
        return this.started && this.allowResume;
    }

    public load(opts: SMState): void {
        this.id = opts.id;
        this.allowResume = opts.allowResume ?? true;
        this.handled = opts.handled;
        this.lastAck = opts.lastAck;
        this.unacked = opts.unacked;

        this.emit('prebound', opts.jid);
    }

    public cache(handler: (data: SMState) => void): void {
        this.cacheHandler = handler;
    }

    public async bind(jid: string): Promise<void> {
        this.jid = jid;
        await this._cache();
    }

    public async enable(): Promise<void> {
        this.emit('send', {
            allowResumption: this.allowResume,
            type: 'enable'
        });
    }

    public async resume(): Promise<void> {
        this.emit('send', {
            handled: this.handled,
            previousSession: this.id!,
            type: 'resume'
        });
    }

    public async enabled(resp: StreamManagementEnabled): Promise<void> {
        this.id = resp.id;
        this.allowResume = resp.resume || false;
        this.handled = 0;
        this.inboundStarted = true;

        await this._cache();
    }

    public async resumed(resp: StreamManagementResume): Promise<void> {
        this.id = resp.previousSession;
        this.inboundStarted = true;

        await this.process(resp, true);

        await this._cache();
    }

    public async failed(resp: StreamManagementFailed): Promise<void> {
        // Resumption might fail, but the server can still tell us how far
        // the old session progressed.
        await this.process(resp);

        // We alert that any remaining unacked stanzas failed to send. It has
        // been too long for auto-retrying these to be the right thing to do.
        for (const [kind, stanza] of this.unacked) {
            this.emit('failed', { kind, stanza } as any);
        }

        this._reset();
        await this._cache();
    }

    public ack(): void {
        this.emit('send', {
            handled: this.handled,
            type: 'ack'
        });
    }

    public request(): void {
        this.emit('send', {
            type: 'request'
        });
    }

    public async process(
        ack: StreamManagementAck | StreamManagementResume | StreamManagementFailed,
        resend = false
    ): Promise<void> {
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
            if (resendUnacked.length) {
                this.emit('begin-resend');
                for (const [kind, stanza] of resendUnacked) {
                    this.emit('resend', { kind, stanza } as any);
                }
                this.emit('end-resend');
            }
        }

        await this._cache();
    }

    public async track(
        kind: string,
        stanza: StreamManagementEnable | StreamManagementResume | Message | Presence | IQ
    ): Promise<boolean> {
        if (kind === 'sm' && (stanza.type === 'enable' || stanza.type === 'resume')) {
            this.handled = 0;
            this.outboundStarted = true;

            await this._cache();
            return false;
        }

        if (!this.outboundStarted) {
            return false;
        }
        if (kind !== 'message' && kind !== 'presence' && kind !== 'iq') {
            return false;
        }

        this.unacked.push([kind, stanza] as Unacked);
        await this._cache();
        return true;
    }

    public async handle(): Promise<void> {
        if (this.inboundStarted) {
            this.handled = mod(this.handled + 1, MAX_SEQ);
            await this._cache();
        }
    }

    public async hibernate(): Promise<void> {
        if (!this.resumable) {
            return this.shutdown();
        }

        for (const [kind, stanza] of this.unacked) {
            this.emit('hibernated', { kind, stanza });
        }
    }

    public async shutdown(): Promise<void> {
        return this.failed({ type: 'failed' });
    }

    private async _cache(): Promise<void> {
        try {
            await this.cacheHandler({
                allowResume: this.allowResume,
                handled: this.handled,
                id: this.id,
                jid: this.jid,
                lastAck: this.lastAck,
                unacked: this.unacked
            });
        } catch (err) {
            // TODO: Is there a good way to handle this?
            // istanbul ignore next
            console.error('Failed to cache stream state', err);
        }
    }

    private _reset(): void {
        this.id = '';
        this.inboundStarted = false;
        this.outboundStarted = false;
        this.lastAck = 0;
        this.handled = 0;
        this.unacked = [];
    }
}
