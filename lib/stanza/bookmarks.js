var stanza = require('jxt');
var JID = require('../jid');
var PrivateStorage = require('./private');


function Bookmarks(data, xml) {
    return stanza.init(this, xml, data);
}
Bookmarks.prototype = {
    constructor: {
        value: Bookmarks 
    },
    NS: 'storage:bookmarks',
    EL: 'storage',
    _name: 'bookmarks',
    toString: stanza.toString,
    toJSON: stanza.toJSON,
    get conferences() {
        var results = [];
        var confs = stanza.find(this.xml, this.NS, 'conference');
        confs.forEach(function (conf) {
            results.push({
                name: stanza.getAttribute(conf, 'name'),
                autoJoin: stanza.getBoolAttribute(conf, 'autojoin'),
                jid: new JID(stanza.getAttribute(conf, 'jid')),
                nick: stanza.getSubText(conf, this.NS, 'nick', '')
            });
        });
        return results;
    },
    set conferences(value) {
        var self = this;
        value.forEach(function (conf) {
            var xml = document.createElementNS(self.NS, 'conference');
            stanza.setAttribute(xml, 'name', conf.name);
            stanza.setBoolAttribute(xml, 'autojoin', conf.autoJoin);
            stanza.setAttribute(xml, 'jid', conf.jid.toString());
            stanza.setSubText(xml, self.NS, 'nick', conf.nick);
        });
    }
};


stanza.extend(PrivateStorage, Bookmarks);

module.exports = Bookmarks;
