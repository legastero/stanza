import { Namespaces as NS } from './protocol';

const MAX_SEQ = Math.pow(2, 32);
const mod = (v, n) => ((v % n) + n) % n;

export default class StreamManagement {
    constructor(client) {
        this.client = client;
        this.id = false;
        this.allowResume = true;
        this.started = false;
        this.inboundStarted = false;
        this.outboundStarted = false;
        this.lastAck = 0;
        this.handled = 0;
        this.windowSize = 1;
        this.unacked = [];
        this.pendingAck = false;

        this.cacheHandler = () => {
            return;
        };

        this.stanzas = {
            Ack: client.stanzas.getDefinition('a', NS.SMACKS_3),
            Enable: client.stanzas.getDefinition('enable', NS.SMACKS_3),
            IQ: client.stanzas.getIQ(),
            Message: client.stanzas.getMessage(),
            Presence: client.stanzas.getPresence(),
            Request: client.stanzas.getDefinition('r', NS.SMACKS_3),
            Resume: client.stanzas.getDefinition('resume', NS.SMACKS_3)
        };
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

    load(opts) {
        this.id = opts.id;
        this.allowResume = true;
        this.handled = opts.handled;
        this.lastAck = opts.lastAck;
        this.unacked = opts.unacked;
    }

    cache(handler) {
        this.cacheHandler = handler;
    }

    enable() {
        const enable = new this.stanzas.Enable();
        enable.resume = this.allowResume;
        this.client.send(enable);
        this.handled = 0;
        this.outboundStarted = true;
    }

    resume() {
        const resume = new this.stanzas.Resume({
            h: this.handled,
            previd: this.id
        });
        this.client.send(resume);
        this.outboundStarted = true;
    }

    enabled(resp) {
        this.id = resp.id;
        this.handled = 0;
        this.inboundStarted = true;

        this._cache();
    }

    resumed(resp) {
        this.id = resp.previd;
        if (resp.h) {
            this.process(resp, true);
        }
        this.inboundStarted = true;

        this._cache();
    }

    failed() {
        this.inboundStarted = false;
        this.outboundStarted = false;
        this.id = false;
        this.lastAck = 0;
        this.handled = 0;
        this.unacked = [];

        this._cache();
    }

    ack() {
        this.client.send(
            new this.stanzas.Ack({
                h: this.handled
            })
        );
    }

    request() {
        this.pendingAck = true;
        this.client.send(new this.stanzas.Request());
    }

    process(ack, resend) {
        const self = this;
        const numAcked = mod(ack.h - this.lastAck, MAX_SEQ);

        this.pendingAck = false;

        for (let i = 0; i < numAcked && this.unacked.length > 0; i++) {
            const [kind, stanza] = this.unacked.shift();
            this.client.emit('stanza:acked', stanza, kind);
        }
        this.lastAck = ack.h;

        if (resend) {
            const resendUnacked = this.unacked;
            this.unacked = [];
            for (const [kind, stanza] of resendUnacked) {
                let rebuilt;
                if (kind === 'message') {
                    rebuilt = new this.stanzas.Message(stanza);
                }
                if (kind === 'presence') {
                    rebuilt = new this.stanzas.Presence(stanza);
                }
                if (kind === 'iq') {
                    rebuilt = new this.stanzas.IQ(stanza);
                }
                self.client.send(rebuilt);
            }
        }

        this._cache();

        if (this.needAck()) {
            this.request();
        }
    }

    track(kind, stanza) {
        const acceptable = {
            iq: true,
            message: true,
            presence: true
        };

        if (this.outboundStarted && acceptable[kind]) {
            this.unacked.push([kind, stanza.toJSON()]);
            this._cache();

            if (this.needAck()) {
                this.request();
            }
        }
    }

    handle() {
        if (this.inboundStarted) {
            this.handled = mod(this.handled + 1, MAX_SEQ);
            this._cache();
        }
    }

    needAck() {
        return !this.pendingAck && this.unacked.length >= this.windowSize;
    }

    _cache() {
        this.cacheHandler({
            handled: this.handled,
            id: this.id,
            lastAck: this.lastAck,
            unacked: this.unacked
        });
    }
}
