var stanza = require('./stanza'),
    Iq = require('./iq').Iq;


function EntityTime(data, xml) {
    return stanza.init(this, xml, data);
}
EntityTime.prototype = {
    constructor: {
        value: EntityTime 
    },
    NS: 'urn:xmpp:time',
    EL: 'time',
    _name: 'time',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get tzo () {
        var sign = -1,
            formatted = stanza.getSubText(this.xml, this.NS, 'tzo');
        if (!formatted) {
            return 0;
        }
        if (formatted.charAt(0) === '-') {
            sign = 1;
            formatted.slice(1);
        }
        var split = formatted.split(':'),
            hrs = parseInt(split[0], 10),
            min = parseInt(split[1], 10);
        return (hrs * 60 + min) * sign;
    },
    set tzo (value) {
        var formatted = '-';
        if (typeof value === 'number') {
            if (value < 0) {
                value = -value;
                formatted = '+';
            }
            var hrs = value / 60,
                min = value % 60;
            formatted += (hrs < 10 ? '0' : '') + hrs + ':' + (min < 10 ? '0' : '') + min;
        } else {
            formatted = value;
        }
        stanza.setSubText(this.xml, this.NS, 'tzo', formatted);
    },
    get utc () {
        var stamp = stanza.getSubText(this.xml, this.NS, 'utc');
        if (stamp) {
            return new Date(stamp);
        }
        return ''
    },
    set utc (value) {
        stanza.setSubText(this.xml, this.NS, 'utc', value.toISOString());
    }
};


stanza.extend(Iq, EntityTime);

exports.EntityTime = EntityTime;
