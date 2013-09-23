var stanza = require('jxt');
var util = require('./util');
var Iq = require('./iq');

var EntityTime = module.exports = stanza.define({
    name: 'time',
    namespace: 'urn:xmpp:time',
    element: 'time',
    fields: {
        utc: util.dateSub('urn:xmpp:time', 'utc'),
        tzo: {
            get: function () {
                var split, hrs, min;
                var sign = -1;
                var formatted = stanza.getSubText(this.xml, this._NS, 'tzo');

                if (!formatted) {
                    return 0;
                }
                if (formatted.charAt(0) === '-') {
                    sign = 1;
                    formatted = formatted.slice(1);
                }
                split = formatted.split(':');
                hrs = parseInt(split[0], 10);
                min = parseInt(split[1], 10);
                return (hrs * 60 + min) * sign;
            },
            set: function (value) {
                var hrs, min;
                var formatted = '-';
                if (typeof value === 'number') {
                    if (value < 0) {
                        value = -value;
                        formatted = '+';
                    }
                    hrs = value / 60;
                    min = value % 60;
                    formatted += (hrs < 10 ? '0' : '') + hrs + ':' + (min < 10 ? '0' : '') + min;
                } else {
                    formatted = value;
                }
                stanza.setSubText(this.xml, this._NS, 'tzo', formatted);
            }
        }
    }
});


stanza.extend(Iq, EntityTime);
