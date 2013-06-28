var stanza = require('./stanza');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');


function MUCJoin(data, xml) {
    return stanza.init(this, xml, data);
}
MUCJoin.prototype = {
    constructor: {
        value: MUCJoin 
    },
    NS: 'http://jabber.org/protocol/muc',
    EL: 'x',
    _name: 'joinMuc',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get password() {
        return stanza.getSubText(this.xml, this.NS, 'password');
    },
    set password(value) {
        stanza.setSubText(this.xml, this.NS, 'password', value);
    },
    get history() {
        var result = {};
        var hist = stanza.find(this.xml, this.NS, 'history');

        if (!hist.length) {
            return {};
        }
        hist = hist[0];

        var maxchars = hist.getAttribute('maxchars') || '';
        var maxstanzas = hist.getAttribute('maxstanas') || '';
        var seconds = hist.getAttribute('seconds') || '';
        var since = hist.getAttribute('since') || '';


        if (maxchars) {
            result.maxchars = parseInt(maxchars, 10);
        }
        if (maxstanzas) {
            result.maxstanzas = parseInt(maxstanzas, 10);
        }
        if (seconds) {
            result.seconds = parseInt(seconds, 10);
        }
        if (since) {
            result.since = new Date(since);
        }
    },
    set history(opts) {
        var existing = stanza.find(this.xml, this.NS, 'history');
        if (existing.length) {
            for (var i = 0; i < existing.length; i++) {
                this.xml.removeChild(existing[i]);
            }
        }

        var hist = document.createElementNS(this.NS, 'history');
        this.xml.appendChild(hist);

        if (opts.maxchars) {
            hist.setAttribute('' + opts.maxchars);
        }
        if (opts.maxstanzas) {
            hist.setAttribute('' + opts.maxstanzas);
        }
        if (opts.seconds) {
            hist.setAttribute('' + opts.seconds);
        }
        if (opts.since) {
            hist.setAttribute(opts.since.toISOString());
        }
    }
};


stanza.extend(Presence, MUCJoin);

exports.MUCJoin = MUCJoin;
