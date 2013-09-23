var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');


var NS = 'http://jabber.org/protocol/muc';


exports.MUCJoin = stanza.define({
    name: 'joinMuc',
    namespace: NS,
    element: 'x',
    fields: {
        password: stanza.subText(NS, 'password'),
        history: {
            get: function () {
                var result = {};
                var hist = stanza.find(this.xml, this._NS, 'history');

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
            set: function (opts) {
                var existing = stanza.find(this.xml, this._NS, 'history');
                if (existing.length) {
                    for (var i = 0; i < existing.length; i++) {
                        this.xml.removeChild(existing[i]);
                    }
                }

                var hist = document.createElementNS(this._NS, 'history');
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
        }
    }
});


stanza.extend(Presence, exports.MUCJoin);
