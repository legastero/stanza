'use strict';

var stanza = require('jxt');
var Message = require('./message');
var Presence = require('./presence');
var Iq = require('./iq');
var DataForm = require('./dataforms').DataForm;
var util = require('./util');

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

var UserItem = stanza.define({
    name: '_mucUserItem',
    namespace: USER_NS,
    element: 'item',
    fields: {
        affiliation: stanza.attribute('affiliation'),
        nick: stanza.attribute('nick'),
        jid: util.jidAttribute('jid'),
        role: stanza.attribute('role'),
        reason: stanza.subText(USER_NS, 'reason')
    }
});

var UserActor = stanza.define({
    name: '_mucUserActor',
    namespace: USER_NS,
    element: 'actor',
    fields: {
        nick: stanza.attribute('nick'),
        jid: util.jidAttribute('jid')
    }
});

var Destroyed = stanza.define({
    name: 'destroyed',
    namespace: USER_NS,
    element: 'destroy',
    fields: {
        jid: util.jidAttribute('jid'),
        reason: stanza.subText(USER_NS, 'reason')
    }
});

var Invite = stanza.define({
    name: 'invite',
    namespace: USER_NS,
    element: 'invite',
    fields: {
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from'),
        reason: stanza.subText(USER_NS, 'reason'),
        thread: stanza.subAttribute(USER_NS, 'continue', 'thread'),
        'continue': stanza.boolSub(USER_NS, 'continue')
    }
});

var Decline = stanza.define({
    name: 'decline',
    namespace: USER_NS,
    element: 'decline',
    fields: {
        to: util.jidAttribute('to'),
        from: util.jidAttribute('from'),
        reason: stanza.subText(USER_NS, 'reason')
    }
});

var AdminItem = stanza.define({
    name: '_mucAdminItem',
    namespace: ADMIN_NS,
    element: 'item',
    fields: {
        affiliation: stanza.attribute('affiliation'),
        nick: stanza.attribute('nick'),
        jid: util.jidAttribute('jid'),
        role: stanza.attribute('role'),
        reason: stanza.subText(ADMIN_NS, 'reason')
    }
});

var AdminActor = stanza.define({
    name: 'actor',
    namespace: USER_NS,
    element: 'actor',
    fields: {
        nick: stanza.attribute('nick'),
        jid: util.jidAttribute('jid')
    }
});

var Destroy = stanza.define({
    name: 'destroy',
    namespace: OWNER_NS,
    element: 'destroy',
    fields: {
        jid: util.jidAttribute('jid'),
        password: stanza.subText(OWNER_NS, 'password'),
        reason: stanza.subText(OWNER_NS, 'reason')
    }
});

exports.MUC = stanza.define({
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
        password: stanza.subText(USER_NS, 'password'),
        codes: {
            get: function () {
                return stanza.getMultiSubText(this.xml, USER_NS, 'status', function (sub) {
                    return stanza.getAttribute(sub, 'code');
                });
            },
            set: function (value) {
                var self = this;
                stanza.setMultiSubText(this.xml, USER_NS, 'status', value, function (val) {
                    var child = stanza.createElement(USER_NS, 'status', USER_NS);
                    stanza.setAttribute(child, 'code', val);
                    self.xml.appendChild(child);
                });
            }
        }
    }
});

exports.MUCAdmin = stanza.define({
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

exports.MUCOwner = stanza.define({
    name: 'mucOwner',
    namespace: OWNER_NS,
    element: 'query'
});

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

                var hist = stanza.createElement(this._NS, 'history', this._NS);
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

exports.DirectInvite = stanza.define({
    name: 'mucInvite',
    namespace: 'jabber:x:conference',
    element: 'x',
    fields: {
        jid: util.jidAttribute('jid'),
        password: stanza.attribute('password'),
        reason: stanza.attribute('reason'),
        thread: stanza.attribute('thread'),
        'continue': stanza.boolAttribute('continue')
    }
});


stanza.add(Iq, 'mucUnique', stanza.subText(UNIQ_NS, 'unique'));


stanza.extend(UserItem, UserActor);
stanza.extend(exports.MUC, UserItem);
stanza.extend(exports.MUC, Invite, 'invites');
stanza.extend(exports.MUC, Decline);
stanza.extend(exports.MUC, Destroyed);
stanza.extend(AdminItem, AdminActor);
stanza.extend(exports.MUCAdmin, AdminItem, 'items');
stanza.extend(exports.MUCOwner, Destroy);
stanza.extend(exports.MUCOwner, DataForm);
stanza.extend(Presence, exports.MUC);
stanza.extend(Message, exports.MUC);
stanza.extend(Presence, exports.MUCJoin);
stanza.extend(Message, exports.DirectInvite);
stanza.extend(Iq, exports.MUCAdmin);
stanza.extend(Iq, exports.MUCOwner);
