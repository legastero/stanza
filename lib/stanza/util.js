var stanza = require('jxt');
var JID = require('../jid');
var XML_NS = 'http://www.w3.org/XML/1998/namespace';


exports.langAttribute = stanza.field(
    function (xml) {
        return xml.getAttributeNS(XML_NS, 'lang') || '';
    },
    function (xml, value) {
        xml.setAttributeNS(XML_NS, 'lang', value);
    }
);

exports.jidAttribute = stanza.field(
    function (xml, attr) {
        return new JID(stanza.getAttribute(xml, attr));
    },
    function (xml, attr, value) {
        stanza.setAttribute(xml, attr, (value || '').toString());
    }
);

exports.jidSub = stanza.field(
    function (xml, NS, sub) {
        return new JID(stanza.getSubText(xml, NS, sub));
    },
    function (xml, NS, sub, value) {
        stanza.setSubText(xml, NS, sub, (value || '').toString());
    }
);

exports.b64Text = stanza.field(
    function (xml) {
        if (xml.textContent && xml.textContent != '=') {
            return atob(xml.textContent);
        }
        return '';
    },
    function (xml, value) {
        xml.textContent = btoa(value) || '=';
    }
);

exports.dateAttribute = stanza.field(
    function (xml, attr) {
        return new Date(stanza.getAttribute(xml, attr) || Date.now());
    },
    function (xml, attr, value) {
        if (!value) return;
        stanza.setAttribute(xml, attr, value.toISOString());
    }
);

exports.dateSub = stanza.field(
    function (xml, NS, sub) {
        return new Date(stanza.getSubText(xml, NS, sub) || Date.now());
    },
    function (xml, NS, sub, value) {
        if (!value) return;
        stanza.setSubText(xml, NS, sub, value.toISOString());
    }
);

exports.numberAttribute = stanza.field(
    function (xml, attr, defaultVal) {
        return parseInt(stanza.getAttribute(xml, attr, defaultVal), 10);
    },
    function (xml, attr, value) {
        stanza.setAttribute(xml, attr, value.toString());
    }
);

exports.numberSub = stanza.field(
    function (xml, NS, sub, defaultVal) {
        return parseInt(stanza.getSubText(xml, NS, sub, defaultVal), 10);
    },
    function (xml, NS, sub, value) {
        stanza.setSubText(xml, NS, sub, value.toString());
    }
);
