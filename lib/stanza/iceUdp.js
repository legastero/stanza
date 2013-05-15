var _ = require('lodash'),
    stanza = require('./stanza'),
    jingle = require('./jingle');


function ICEUDP(data, xml) {
    return stanza.init(this, xml, data);
}
ICEUDP.prototype = {
    constructor: {
        value: ICEUDP
    },
    _name: 'iceUdp',
    NS: 'urn:xmpp:jingle:transports:ice-udp:1',
    EL: 'transport',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get pwd () {
        return stanza.getAttribute(this.xml, 'pwd');
    },
    set pwd (value) {
        stanza.setAttribute(this.xml, 'pwd', value);
    },
    get ufrag () {
        return stanza.getAttribute(this.xml, 'ufrag');
    },
    set ufrag (value) {
        stanza.setAttribute(this.xml, 'ufrag', value);
    },
    get candidates () {
    },
    set candidates (value) {
    },
    get remoteCandidate () {
        return {
            component: stanza.getSubAttribute(this.xml, this.NS, 'remote-candidate', 'component'),
            ip: stanza.getSubAttribute(this.xml, this.NS, 'remote-candidate', 'ip'),
            port: stanza.getSubAttribute(this.xml, this.NS, 'remote-candidate', 'port'),
        };
    },
    set remoteCandidate (value) {
        stanza.setSubAttribute(this.xml, this.NS, 'remote-candidate', 'component', value.component);
        stanza.setSubAttribute(this.xml, this.NS, 'remote-candidate', 'ip', value.ip);
        stanza.setSubAttribute(this.xml, this.NS, 'remote-candidate', 'port', value.port);
    }
};


function Candidate(data, xml) {
    return stanza.init(this, xml, data);
}
Candidate.prototype = {
    constructor: {
        value: Candidate
    },
    _name: 'iceUdpCandidate',
    NS: 'urn:xmpp:jingle:transports:ice-udp:1',
    EL: 'candidate',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get component () {
        return stanza.getAttribute(this.xml, 'component');
    },
    set component (value) {
        stanza.setAttribute(this.xml, 'component', value);
    },
    get foundation () {
        return stanza.getAttribute(this.xml, 'foundation');
    },
    set foundation (value) {
        stanza.setAttribute(this.xml, 'foundation', value);
    },
    get generation () {
        return stanza.getAttribute(this.xml, 'generation');
    },
    set generation (value) {
        stanza.setAttribute(this.xml, 'generation', value);
    },
    get id () {
        return stanza.getAttribute(this.xml, 'id');
    },
    set id (value) {
        stanza.setAttribute(this.xml, 'id', value);
    },
    get ip () {
        return stanza.getAttribute(this.xml, 'ip');
    },
    set ip (value) {
        stanza.setAttribute(this.xml, 'ip', value);
    },
    get network () {
        return stanza.getAttribute(this.xml, 'network');
    },
    set network (value) {
        stanza.setAttribute(this.xml, 'network', value);
    },
    get port () {
        return stanza.getAttribute(this.xml, 'port');
    },
    set port (value) {
        stanza.setAttribute(this.xml, 'port', value);
    },
    get priority () {
        return stanza.getAttribute(this.xml, 'priority');
    },
    set priority (value) {
        stanza.setAttribute(this.xml, 'priority', value);
    },
    get protocol () {
        return stanza.getAttribute(this.xml, 'protocol');
    },
    set protocol (value) {
        stanza.setAttribute(this.xml, 'protocol', value);
    },
    get relAddr () {
        return stanza.getAttribute(this.xml, 'relAddr');
    },
    set relAddr (value) {
        stanza.setAttribute(this.xml, 'relAddr', value);
    },
    get relPort () {
        return stanza.getAttribute(this.xml, 'relPort');
    },
    set relPort (value) {
        stanza.setAttribute(this.xml, 'relPort', value);
    },
    get type () {
        return stanza.getAttribute(this.xml, 'type');
    },
    set type (value) {
        stanza.setAttribute(this.xml, 'type', value);
    }
};


stanza.extend(jingle.Content, ICEUDP);

exports.ICEUDP = ICEUDP;
exports.Candidate = Candidate;
