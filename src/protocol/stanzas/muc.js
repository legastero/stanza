import * as NS from '../namespaces';

function proxy(child, field) {
    return {
        get: function() {
            if (this._extensions[child]) {
                return this[child][field];
            }
        },
        set: function(value) {
            this[child][field] = value;
        }
    };
}

export default function(JXT) {
    const Utils = JXT.utils;

    const UserItem = JXT.define({
        element: 'item',
        fields: {
            affiliation: Utils.attribute('affiliation'),
            jid: Utils.jidAttribute('jid'),
            nick: Utils.attribute('nick'),
            reason: Utils.textSub(NS.MUC_USER, 'reason'),
            role: Utils.attribute('role')
        },
        name: '_mucUserItem',
        namespace: NS.MUC_USER
    });

    const UserActor = JXT.define({
        element: 'actor',
        fields: {
            jid: Utils.jidAttribute('jid'),
            nick: Utils.attribute('nick')
        },
        name: '_mucUserActor',
        namespace: NS.MUC_USER
    });

    const Destroyed = JXT.define({
        element: 'destroy',
        fields: {
            jid: Utils.jidAttribute('jid'),
            reason: Utils.textSub(NS.MUC_USER, 'reason')
        },
        name: 'destroyed',
        namespace: NS.MUC_USER
    });

    const Invite = JXT.define({
        element: 'invite',
        fields: {
            continue: Utils.boolSub(NS.MUC_USER, 'continue'),
            from: Utils.jidAttribute('from'),
            reason: Utils.textSub(NS.MUC_USER, 'reason'),
            thread: Utils.subAttribute(NS.MUC_USER, 'continue', 'thread'),
            to: Utils.jidAttribute('to')
        },
        name: 'invite',
        namespace: NS.MUC_USER
    });

    const Decline = JXT.define({
        element: 'decline',
        fields: {
            from: Utils.jidAttribute('from'),
            reason: Utils.textSub(NS.MUC_USER, 'reason'),
            to: Utils.jidAttribute('to')
        },
        name: 'decline',
        namespace: NS.MUC_USER
    });

    const AdminItem = JXT.define({
        element: 'item',
        fields: {
            affiliation: Utils.attribute('affiliation'),
            jid: Utils.jidAttribute('jid'),
            nick: Utils.attribute('nick'),
            reason: Utils.textSub(NS.MUC_ADMIN, 'reason'),
            role: Utils.attribute('role')
        },
        name: '_mucAdminItem',
        namespace: NS.MUC_ADMIN
    });

    const AdminActor = JXT.define({
        element: 'actor',
        fields: {
            jid: Utils.jidAttribute('jid'),
            nick: Utils.attribute('nick')
        },
        name: 'actor',
        namespace: NS.MUC_USER
    });

    const Destroy = JXT.define({
        element: 'destroy',
        fields: {
            jid: Utils.jidAttribute('jid'),
            password: Utils.textSub(NS.MUC_OWNER, 'password'),
            reason: Utils.textSub(NS.MUC_OWNER, 'reason')
        },
        name: 'destroy',
        namespace: NS.MUC_OWNER
    });

    const MUC = JXT.define({
        element: 'x',
        fields: {
            actor: proxy('_mucUserItem', '_mucUserActor'),
            affiliation: proxy('_mucUserItem', 'affiliation'),
            codes: {
                get: function() {
                    return Utils.getMultiSubText(this.xml, NS.MUC_USER, 'status', function(sub) {
                        return Utils.getAttribute(sub, 'code');
                    });
                },
                set: function(value) {
                    const self = this;
                    Utils.setMultiSubText(this.xml, NS.MUC_USER, 'status', value, function(val) {
                        const child = Utils.createElement(NS.MUC_USER, 'status', NS.MUC_USER);
                        Utils.setAttribute(child, 'code', val);
                        self.xml.appendChild(child);
                    });
                }
            },
            jid: proxy('_mucUserItem', 'jid'),
            nick: proxy('_mucUserItem', 'nick'),
            password: Utils.textSub(NS.MUC_USER, 'password'),
            reason: proxy('_mucUserItem', 'reason'),
            role: proxy('_mucUserItem', 'role')
        },
        name: 'muc',
        namespace: NS.MUC_USER
    });

    const MUCAdmin = JXT.define({
        element: 'query',
        fields: {
            actor: proxy('_mucAdminItem', '_mucAdminActor'),
            affiliation: proxy('_mucAdminItem', 'affiliation'),
            jid: proxy('_mucAdminItem', 'jid'),
            nick: proxy('_mucAdminItem', 'nick'),
            reason: proxy('_mucAdminItem', 'reason'),
            role: proxy('_mucAdminItem', 'role')
        },
        name: 'mucAdmin',
        namespace: NS.MUC_ADMIN
    });

    const MUCOwner = JXT.define({
        element: 'query',
        name: 'mucOwner',
        namespace: NS.MUC_OWNER
    });

    const MUCJoin = JXT.define({
        element: 'x',
        fields: {
            history: {
                get: function() {
                    const result = {};
                    let hist = Utils.find(this.xml, NS.MUC, 'history');

                    if (!hist.length) {
                        return {};
                    }

                    hist = hist[0];
                    const maxchars = hist.getAttribute('maxchars') || '';
                    const maxstanzas = hist.getAttribute('maxstanzas') || '';
                    const seconds = hist.getAttribute('seconds') || '';
                    const since = hist.getAttribute('since') || '';

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
                set: function(opts) {
                    const existing = Utils.find(this.xml, NS.MUC, 'history');

                    if (existing.length) {
                        for (let i = 0; i < existing.length; i++) {
                            this.xml.removeChild(existing[i]);
                        }
                    }

                    const hist = Utils.createElement(NS.MUC, 'history', NS.MUC);
                    this.xml.appendChild(hist);

                    if (opts.maxchars !== undefined) {
                        hist.setAttribute('maxchars', '' + opts.maxchars);
                    }

                    if (opts.maxstanzas !== undefined) {
                        hist.setAttribute('maxstanzas', '' + opts.maxstanzas);
                    }

                    if (opts.seconds !== undefined) {
                        hist.setAttribute('seconds', '' + opts.seconds);
                    }

                    if (opts.since) {
                        hist.setAttribute('since', opts.since.toISOString());
                    }
                }
            },
            password: Utils.textSub(NS.MUC, 'password')
        },
        name: 'joinMuc',
        namespace: NS.MUC
    });

    const DirectInvite = JXT.define({
        element: 'x',
        fields: {
            continue: Utils.boolAttribute('continue'),
            jid: Utils.jidAttribute('jid'),
            password: Utils.attribute('password'),
            reason: Utils.attribute('reason'),
            thread: Utils.attribute('thread')
        },
        name: 'mucInvite',
        namespace: NS.MUC_DIRECT_INVITE
    });

    JXT.extend(UserItem, UserActor);
    JXT.extend(MUC, UserItem);
    JXT.extend(MUC, Invite, 'invites');
    JXT.extend(MUC, Decline);
    JXT.extend(MUC, Destroyed);
    JXT.extend(AdminItem, AdminActor);
    JXT.extend(MUCAdmin, AdminItem, 'items');
    JXT.extend(MUCOwner, Destroy);

    JXT.extendPresence(MUC);
    JXT.extendPresence(MUCJoin);

    JXT.extendMessage(MUC);
    JXT.extendMessage(DirectInvite);

    JXT.withIQ(function(IQ) {
        JXT.add(IQ, 'mucUnique', Utils.textSub(NS.MUC_UNIQUE, 'unique'));
        JXT.extend(IQ, MUCAdmin);
        JXT.extend(IQ, MUCOwner);
    });

    JXT.withDataForm(function(DataForm) {
        JXT.extend(MUCOwner, DataForm);
    });
}
