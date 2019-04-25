import { Agent } from './Definitions';
import {
    IQ,
    Message,
    Presence,
    StreamManagementAck,
    StreamManagementEnabled,
    StreamManagementFailed,
    StreamManagementResume
} from './protocol';

const MAX_SEQ = Math.pow(2, 32);
const mod = (v: number, n: number) => ((v % n) + n) % n;

interface SMState {
    handled: number;
    id?: string;
    lastAck: number;
    unacked: Array<['message' | 'presence' | 'iq', Message | Presence | IQ]>;
}

export default class StreamManagement {
    public id?: string;
    public allowResume: boolean;
    public lastAck: number;
    public handled: number;
    public windowSize: number;
    public unacked: Array<['message' | 'presence' | 'iq', Message | Presence | IQ]>;

    private pendingAck: boolean;
    private inboundStarted: boolean;
    private outboundStarted: boolean;
    private client: Agent;
    private cacheHandler: (state: SMState) => void;

    constructor(client: Agent) {
        this.client = client;
        this.id = undefined;
        this.allowResume = true;
        this.started = false;
        this.inboundStarted = false;
        this.outboundStarted = false;
        this.lastAck = 0;
        this.handled = 0;
        this.windowSize = 1;
        this.unacked = [];
        this.pendingAck = false;
        this.cacheHandler = () => null;
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
    }

    public cache(handler: (data: SMState) => void) {
        this.cacheHandler = handler;
    }

    public enable() {
        this.client.send('sm', {
            allowResumption: this.allowResume,
            type: 'enable'
        });
        this.handled = 0;
        this.outboundStarted = true;
    }

    public resume() {
        this.client.send('sm', {
            handled: this.handled,
            previousSession: this.id!,
            type: 'resume'
        });
        this.outboundStarted = true;
    }

    public enabled(resp: StreamManagementEnabled) {
        this.id = resp.id;
        this.handled = 0;
        this.inboundStarted = true;

        this._cache();
    }

    public resumed(resp: StreamManagementResume) {
        this.id = resp.previousSession;
        if (resp.handled) {
            this.process(resp, true);
        }
        this.inboundStarted = true;

        this._cache();
    }

    public failed(resp: StreamManagementFailed) {
        // Resumption might fail, but the server can still tell us how far
        // the old session progressed.
        if (resp.handled) {
            this.process(resp);
        }

        // We alert that any remaining unacked stanzas failed to send. It has
        // been too long for auto-retrying these to be the right thing to do.
        for (const [kind, stanza] of this.unacked) {
            this.client.emit('stanza:failed', stanza, kind);
        }

        this.inboundStarted = false;
        this.outboundStarted = false;
        this.id = undefined;
        this.lastAck = 0;
        this.handled = 0;
        this.unacked = [];

        this._cache();
    }

    public ack() {
        this.client.send('sm', {
            handled: this.handled,
            type: 'ack'
        });
    }

    public request() {
        this.pendingAck = true;
        this.client.send('sm', {
            type: 'request'
        });
    }

    public process(
        ack: StreamManagementAck | StreamManagementResume | StreamManagementFailed,
        resend: boolean = false
    ) {
        if (!ack.handled) {
            return;
        }

        const numAcked = mod(ack.handled - this.lastAck, MAX_SEQ);
        this.pendingAck = false;
        for (let i = 0; i < numAcked && this.unacked.length > 0; i++) {
            this.client.emit('stanza:acked', this.unacked.shift());
        }
        this.lastAck = ack.handled;

        if (resend) {
            const resendUnacked = this.unacked;
            this.unacked = [];
            for (const [kind, stanza] of resendUnacked) {
                this.client.send(kind, stanza);
            }
        }

        this._cache();

        if (this.needAck()) {
            this.request();
        }
    }

    public track(kind: string, stanza: Message | Presence | IQ) {
        if (kind !== 'message' && kind !== 'presence' && kind !== 'iq') {
            return;
        }

        if (this.outboundStarted) {
            this.unacked.push([kind, stanza]);
            this._cache();

            if (this.needAck()) {
                this.request();
            }
        }
    }

    public handle() {
        if (this.inboundStarted) {
            this.handled = mod(this.handled + 1, MAX_SEQ);
            this._cache();
        }
    }

    public needAck() {
        return !this.pendingAck && this.unacked.length >= this.windowSize;
    }

    private _cache() {
        this.cacheHandler({
            handled: this.handled,
            id: this.id,
            lastAck: this.lastAck,
            unacked: this.unacked
        });
    }
}
