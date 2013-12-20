"use strict";

var JID = require('../jid');
require('../stanza/muc');


module.exports = function (client) {
    client.disco.addFeature('', 'jabber:x:conference');

    client.on('message', function (msg) {
        if (msg._extensions.muc) {
            if (msg._extensions.muc._extensions.invite) {
                client.emit('muc:invite', {
                    from: msg.muc.invite.from,
                    room: msg.from,
                    reason: msg.muc.invite.reason,
                    password: msg.muc.password,
                    thread: msg.muc.invite.thread
                });
            }
            if (msg._extensions.muc._extensions.destroyed) {
                client.emit('muc:destroyed', {
                    room: msg.from,
                    newRoom: msg.muc.destroyed.jid,
                    reason: msg.muc.destroyed.reason,
                    password: msg.muc.password
                });
            }
            if (msg._extensions.muc._extensions.decline) {
                client.emit('muc:declined', {
                    room: msg.from,
                    from: msg.muc.decline.from,
                    reason: msg.muc.decline.reason
                });
            }
        } else if (msg._extensions.mucInvite) {
            client.emit('muc:invite', {
                from: msg.from,
                room: msg.mucInvite.jid,
                reason: msg.mucInvite.reason,
                password: msg.mucInvite.password,
                thread: msg.mucInvite.thread
            });
        }

        if (msg.type === 'groupchat' && msg.subject) {
            client.emit('groupchat:subject', msg);
        }
    });

    client.joinRoom = function (room, nick, opts) {
        opts = opts || {};
        opts.to = room + '/' + nick;
        opts.caps = this.disco.caps;
        opts.joinMuc = opts.joinMuc || {};

        this.sendPresence(opts);
    };

    client.leaveRoom = function (room, nick, opts) {
        opts = opts || {};
        opts.to = room + '/' + nick;
        opts.type = 'unavailable';
        this.sendPresence(opts);
    };

    client.ban = function (room, jid, reason, cb) {
        client.setRoomAffiliation(room, jid, 'outcast', reason, cb);
    };

    client.kick = function (room, nick, reason, cb) {
        client.setRoomRole(room, nick, 'none', reason, cb);
    };

    client.invite = function (room, opts) {
        client.sendMessage({
            to: room,
            muc: {
                invites: opts
            }
        });
    };

    client.directInvite = function (room, opts) {
        opts.jid = room;
        client.sendMessage({
            to: opts.to,
            mucInvite: opts
        });
    };

    client.declineInvite = function (room, sender, reason) {
        client.sendMessage({
            to: room,
            muc: {
                decline: {
                    to: sender,
                    reason: reason
                }
            }
        });
    };

    client.changeNick = function (room, nick) {
        client.sendPresence({
            to: (new JID(room)).bare + '/' + nick
        });
    };

    client.setSubject = function (room, subject) {
        client.sendMessage({
            to: room,
            type: 'groupchat',
            subject: subject
        });
    };

    client.discoverReservedNick = function (room, cb) {
        client.getDiscoInfo(room, 'x-roomuser-item', function (err, res) {
            if (err) return cb(err);
            var ident = res.discoInfo.identities[0] || {};
            cb(null, ident.name);
        });
    };

    client.requestRoomVoice = function (room) {
        client.sendMessage({
            to: room,
            form: {
                fields: [
                    {
                        name: 'FORM_TYPE',
                        value: 'http://jabber.org/protocol/muc#request'
                    },
                    {
                        name: 'muc#role',
                        type: 'text-single',
                        value: 'participant'
                    }
                ]
            }
        });
    };

    client.setRoomAffiliation = function (room, jid, affiliation, reason, cb) {
        client.sendIq({
            type: 'set',
            to: room,
            mucAdmin: {
                jid: jid,
                affiliation: affiliation,
                reason: reason
            }
        }, cb);
    };

    client.setRoomRole = function (room, nick, role, reason, cb) {
        client.sendIq({
            type: 'set',
            to: room,
            mucAdmin: {
                nick: nick,
                role: role,
                reason: reason
            }
        }, cb);
    };

    client.getRoomMembers = function (room, opts, cb) {
        client.sendIq({
            type: 'get',
            to: room,
            mucAdmin: opts
        }, cb);
    };

    client.getRoomConfig = function (jid, cb) {
        client.sendIq({
            to: jid,
            type: 'get',
            mucOwner: {}
        }, cb);
    };

    client.configureRoom =  function (jid, form, cb) {
        if (!form.type) form.type = 'submit';
        client.sendIq({
            to: jid,
            type: 'set',
            mucOwner: {
                form: form
            }
        }, cb);
    };
};
