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

        this.stanzas = {
            Enable: client.stanzas.getDefinition('enable', NS.SMACKS_3),
            Resume: client.stanzas.getDefinition('resume', NS.SMACKS_3),
            Ack: client.stanzas.getDefinition('a', NS.SMACKS_3),
            Request: client.stanzas.getDefinition('r', NS.SMACKS_3)
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

    enable() {
        var enable = new this.stanzas.Enable();
        enable.resume = this.allowResume;
        this.client.send(enable);
        this.handled = 0;
        this.outboundStarted = true;
    }

    resume() {
        var resume = new this.stanzas.Resume({
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
    }

    resumed(resp) {
        this.id = resp.previd;
        if (resp.h) {
            this.process(resp, true);
        }
        this.inboundStarted = true;
    }

    failed() {
        this.inboundStarted = false;
        this.outboundStarted = false;
        this.id = false;
        this.lastAck = 0;
        this.handled = 0;
        this.unacked = [];
    }

    ack() {
        this.client.send(new this.stanzas.Ack({
            h: this.handled
        }));
    }

    request() {
        this.pendingAck = true;
        this.client.send(new this.stanzas.Request());
    }

    process(ack, resend) {
        var self = this;
        var numAcked = mod(ack.h - this.lastAck, MAX_SEQ);

        this.pendingAck = false;

        for (var i = 0; i < numAcked && this.unacked.length > 0; i++) {
            this.client.emit('stanza:acked', this.unacked.shift());
        }
        this.lastAck = ack.h;

        if (resend) {
            var resendUnacked = this.unacked;
            this.unacked = [];
            resendUnacked.forEach(function (stanza) {
                self.client.send(stanza);
            });
        }

        if (this.needAck()) {
            this.request();
        }
    }

    track(stanza) {
        var name = stanza._name;
        var acceptable = {
            message: true,
            presence: true,
            iq: true
        };

        if (this.outboundStarted && acceptable[name]) {
            this.unacked.push(stanza);
            if (this.needAck()) {
                this.request();
            }
        }
    }

    handle() {
        if (this.inboundStarted) {
            this.handled = mod(this.handled + 1, MAX_SEQ);
        }
    }

    needAck() {
        return !this.pendingAck && this.unacked.length >= this.windowSize;
    }
}
