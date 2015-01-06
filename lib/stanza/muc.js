'use strict';

var NS = 'http://jabber.org/protocol/muc';
var USER_NS = NS + '#user';
var ADMIN_NS = NS + '#admin';
var OWNER_NS = NS + '#owner';
var UNIQ_NS = NS + '#unique';


var proxy = function (child, field) {
    return {
        get: function () {
            if (this._extensions[child]) {
                return this[child][field];
            }
        },
        set: function (value) {
            this[child][field] = value;
        }
    };
};


module.exports = function (stanza) {
    var types = stanza.utils;

    var UserItem = stanza.define({
        name: '_mucUserItem',
        namespace: USER_NS,
        element: 'item',
        fields: {
            affiliation: types.attribute('affiliation'),
            nick: types.attribute('nick'),
            jid: types.jidAttribute('jid'),
            role: types.attribute('role'),
            reason: types.textSub(USER_NS, 'reason')
        }
    });
    
    var UserActor = stanza.define({
        name: '_mucUserActor',
        namespace: USER_NS,
        element: 'actor',
        fields: {
            nick: types.attribute('nick'),
            jid: types.jidAttribute('jid')
        }
    });
    
    var Destroyed = stanza.define({
        name: 'destroyed',
        namespace: USER_NS,
        element: 'destroy',
        fields: {
            jid: types.jidAttribute('jid'),
            reason: types.textSub(USER_NS, 'reason')
        }
    });
    
    var Invite = stanza.define({
        name: 'invite',
        namespace: USER_NS,
        element: 'invite',
        fields: {
            to: types.jidAttribute('to'),
            from: types.jidAttribute('from'),
            reason: types.textSub(USER_NS, 'reason'),
            thread: types.subAttribute(USER_NS, 'continue', 'thread'),
            'continue': types.boolSub(USER_NS, 'continue')
        }
    });
    
    var Decline = stanza.define({
        name: 'decline',
        namespace: USER_NS,
        element: 'decline',
        fields: {
            to: types.jidAttribute('to'),
            from: types.jidAttribute('from'),
            reason: types.textSub(USER_NS, 'reason')
        }
    });
    
    var AdminItem = stanza.define({
        name: '_mucAdminItem',
        namespace: ADMIN_NS,
        element: 'item',
        fields: {
            affiliation: types.attribute('affiliation'),
            nick: types.attribute('nick'),
            jid: types.jidAttribute('jid'),
            role: types.attribute('role'),
            reason: types.textSub(ADMIN_NS, 'reason')
        }
    });
    
    var AdminActor = stanza.define({
        name: 'actor',
        namespace: USER_NS,
        element: 'actor',
        fields: {
            nick: types.attribute('nick'),
            jid: types.jidAttribute('jid')
        }
    });
    
    var Destroy = stanza.define({
        name: 'destroy',
        namespace: OWNER_NS,
        element: 'destroy',
        fields: {
            jid: types.jidAttribute('jid'),
            password: types.textSub(OWNER_NS, 'password'),
            reason: types.textSub(OWNER_NS, 'reason')
        }
    });
    
    var MUC = stanza.define({
        name: 'muc',
        namespace: USER_NS,
        element: 'x',
        fields: {
            affiliation: proxy('_mucUserItem', 'affiliation'),
            nick: proxy('_mucUserItem', 'nick'),
            jid: proxy('_mucUserItem', 'jid'),
            role: proxy('_mucUserItem', 'role'),
            actor: proxy('_mucUserItem', '_mucUserActor'),
            reason: proxy('_mucUserItem', 'reason'),
            password: types.textSub(USER_NS, 'password'),
            codes: {
                get: function () {
                    return types.getMultiSubText(this.xml, USER_NS, 'status', function (sub) {
                        return types.getAttribute(sub, 'code');
                    });
                },
                set: function (value) {
                    var self = this;
                    types.setMultiSubText(this.xml, USER_NS, 'status', value, function (val) {
                        var child = types.createElement(USER_NS, 'status', USER_NS);
                        types.setAttribute(child, 'code', val);
                        self.xml.appendChild(child);
                    });
                }
            }
        }
    });
    
    var MUCAdmin = stanza.define({
        name: 'mucAdmin',
        namespace: ADMIN_NS,
        element: 'query',
        fields: {
            affiliation: proxy('_mucAdminItem', 'affiliation'),
            nick: proxy('_mucAdminItem', 'nick'),
            jid: proxy('_mucAdminItem', 'jid'),
            role: proxy('_mucAdminItem', 'role'),
            actor: proxy('_mucAdminItem', '_mucAdminActor'),
            reason: proxy('_mucAdminItem', 'reason')
        }
    });
    
    var MUCOwner = stanza.define({
        name: 'mucOwner',
        namespace: OWNER_NS,
        element: 'query'
    });
    
    var MUCJoin = stanza.define({
        name: 'joinMuc',
        namespace: NS,
        element: 'x',
        fields: {
            password: types.textSub(NS, 'password'),
            history: {
                get: function () {
                    var result = {};
                    var hist = types.find(this.xml, this._NS, 'history');
    
                    if (!hist.length) {
                        return {};
                    }
                    hist = hist[0];
    
                    var maxchars = hist.getAttribute('maxchars') || '';
                    var maxtypess = hist.getAttribute('maxstanas') || '';
                    var seconds = hist.getAttribute('seconds') || '';
                    var since = hist.getAttribute('since') || '';
    
    
                    if (maxchars) {
                        result.maxchars = parseInt(maxchars, 10);
                    }
                    if (maxtypess) {
                        result.maxtypess = parseInt(maxtypess, 10);
                    }
                    if (seconds) {
                        result.seconds = parseInt(seconds, 10);
                    }
                    if (since) {
                        result.since = new Date(since);
                    }
                },
                set: function (opts) {
                    var existing = types.find(this.xml, this._NS, 'history');
                    if (existing.length) {
                        for (var i = 0; i < existing.length; i++) {
                            this.xml.removeChild(existing[i]);
                        }
                    }
    
                    var hist = types.createElement(this._NS, 'history', this._NS);
                    this.xml.appendChild(hist);
    
                    if (opts.maxchars) {
                        hist.setAttribute('' + opts.maxchars);
                    }
                    if (opts.maxtypess) {
                        hist.setAttribute('' + opts.maxtypess);
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
    
    var DirectInvite = stanza.define({
        name: 'mucInvite',
        namespace: 'jabber:x:conference',
        element: 'x',
        fields: {
            jid: types.jidAttribute('jid'),
            password: types.attribute('password'),
            reason: types.attribute('reason'),
            thread: types.attribute('thread'),
            'continue': types.boolAttribute('continue')
        }
    });
    
    
    stanza.extend(UserItem, UserActor);
    stanza.extend(MUC, UserItem);
    stanza.extend(MUC, Invite, 'invites');
    stanza.extend(MUC, Decline);
    stanza.extend(MUC, Destroyed);
    stanza.extend(AdminItem, AdminActor);
    stanza.extend(MUCAdmin, AdminItem, 'items');
    stanza.extend(MUCOwner, Destroy);

    stanza.withDataForm(function (DataForm) {
        stanza.extend(MUCOwner, DataForm);
    });

    stanza.withIq(function (Iq) {
        stanza.add(Iq, 'mucUnique', types.textSub(UNIQ_NS, 'unique'));
        stanza.extend(Iq, MUCAdmin);
        stanza.extend(Iq, MUCOwner);
    });
    
    stanza.withPresence(function (Presence) {
        stanza.extend(Presence, MUC);
        stanza.extend(Presence, MUCJoin);
    });

    stanza.withMessage(function (Message) {
        stanza.extend(Message, MUC);
        stanza.extend(Message, DirectInvite);
    });
};
