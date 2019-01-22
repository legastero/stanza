import { Namespaces } from '../protocol';
import { JID } from '../protocol/jid';

export default function(client) {
    client.disco.addFeature(Namespaces.MUC);
    client.disco.addFeature(Namespaces.MUC_DIRECT_INVITE);
    client.disco.addFeature(Namespaces.HATS_0);

    client.joinedRooms = {};
    client.joiningRooms = {};

    function rejoinRooms() {
        const oldJoiningRooms = client.joiningRooms;
        client.joiningRooms = {};
        for (const room of Object.keys(oldJoiningRooms)) {
            const nick = oldJoiningRooms[room];
            client.joinRoom(room, nick);
        }

        const oldJoinedRooms = client.joinedRooms;
        client.joinedRooms = {};
        for (const room of Object.keys(oldJoinedRooms)) {
            const nick = oldJoinedRooms[room];
            client.joinRoom(room, nick);
        }
    }
    client.on('session:started', rejoinRooms);
    client.on('stream:management:resumed', rejoinRooms);

    client.on('message', function(msg) {
        if (msg.muc) {
            if (msg.muc.invite) {
                client.emit('muc:invite', {
                    from: msg.muc.invite.from,
                    password: msg.muc.password,
                    reason: msg.muc.invite.reason,
                    room: msg.from,
                    thread: msg.muc.invite.thread,
                    type: 'mediated'
                });
            } else if (msg.muc.decline) {
                client.emit('muc:declined', {
                    from: msg.muc.decline.from,
                    reason: msg.muc.decline.reason,
                    room: msg.from
                });
            } else {
                client.emit('muc:other', {
                    muc: msg.muc,
                    room: msg.from,
                    to: msg.to
                });
            }
        } else if (msg.mucInvite) {
            client.emit('muc:invite', {
                from: msg.from,
                password: msg.mucInvite.password,
                reason: msg.mucInvite.reason,
                room: msg.mucInvite.jid,
                thread: msg.mucInvite.thread,
                type: 'direct'
            });
        }

        if (msg.type === 'groupchat' && msg.subject) {
            client.emit('muc:subject', msg);
        }
    });

    client.on('presence', function(pres) {
        if (client.joiningRooms[pres.from.bare] && pres.type === 'error') {
            delete client.joiningRooms[pres.from.bare];
            client.emit('muc:failed', pres);
            client.emit('muc:error', pres);
        } else if (pres.muc) {
            const isSelf = pres.muc.codes && pres.muc.codes.indexOf('110') >= 0;
            if (pres.type === 'error') {
                client.emit('muc:error', pres);
            } else if (pres.type === 'unavailable') {
                client.emit('muc:unavailable', pres);
                if (isSelf) {
                    client.emit('muc:leave', pres);
                    delete client.joinedRooms[pres.from.bare];
                }
                if (pres.muc.destroyed) {
                    client.emit('muc:destroyed', {
                        newRoom: pres.muc.destroyed.jid,
                        password: pres.muc.destroyed.password,
                        reason: pres.muc.destroyed.reason,
                        room: pres.from
                    });
                }
            } else {
                client.emit('muc:available', pres);
                if (isSelf && !client.joinedRooms[pres.from.bare]) {
                    client.emit('muc:join', pres);
                    delete client.joiningRooms[pres.from.bare];
                    client.joinedRooms[pres.from.bare] = pres.from.resource;
                }
            }
        }
    });

    client.joinRoom = function(room, nick, opts) {
        opts = opts || {};
        opts.to = room + '/' + nick;
        opts.caps = this.disco.caps;
        opts.joinMuc = opts.joinMuc || {};

        this.joiningRooms[room] = nick;

        this.sendPresence(opts);
    };

    client.leaveRoom = function(room, nick, opts) {
        opts = opts || {};
        opts.to = room + '/' + nick;
        opts.type = 'unavailable';
        this.sendPresence(opts);
    };

    client.ban = function(room, jid, reason, cb) {
        client.setRoomAffiliation(room, jid, 'outcast', reason, cb);
    };

    client.kick = function(room, nick, reason, cb) {
        client.setRoomRole(room, nick, 'none', reason, cb);
    };

    client.invite = function(room, opts) {
        client.sendMessage({
            muc: {
                invites: opts
            },
            to: room
        });
    };

    client.directInvite = function(room, opts) {
        opts.jid = room;
        client.sendMessage({
            mucInvite: opts,
            to: opts.to
        });
    };

    client.declineInvite = function(room, sender, reason) {
        client.sendMessage({
            muc: {
                decline: {
                    reason: reason,
                    to: sender
                }
            },
            to: room
        });
    };

    client.changeNick = function(room, nick) {
        client.sendPresence({
            to: new JID(room).bare + '/' + nick
        });
    };

    client.setSubject = function(room, subject) {
        client.sendMessage({
            subject: subject,
            to: room,
            type: 'groupchat'
        });
    };

    client.discoverReservedNick = function(room, cb) {
        client.getDiscoInfo(room, 'x-roomuser-item', function(err, res) {
            if (err) {
                return cb(err);
            }
            const ident = res.discoInfo.identities[0] || {};
            cb(null, ident.name);
        });
    };

    client.requestRoomVoice = function(room) {
        client.sendMessage({
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
            },
            to: room
        });
    };

    client.setRoomAffiliation = function(room, jid, affiliation, reason, cb) {
        return this.sendIq(
            {
                mucAdmin: {
                    affiliation: affiliation,
                    jid: jid,
                    reason: reason
                },
                to: room,
                type: 'set'
            },
            cb
        );
    };

    client.setRoomRole = function(room, nick, role, reason, cb) {
        return this.sendIq(
            {
                mucAdmin: {
                    nick: nick,
                    reason: reason,
                    role: role
                },
                to: room,
                type: 'set'
            },
            cb
        );
    };

    client.getRoomMembers = function(room, opts, cb) {
        return this.sendIq(
            {
                mucAdmin: opts,
                to: room,
                type: 'get'
            },
            cb
        );
    };

    client.getRoomConfig = function(jid, cb) {
        return this.sendIq(
            {
                mucOwner: true,
                to: jid,
                type: 'get'
            },
            cb
        );
    };

    client.configureRoom = function(jid, form, cb) {
        if (!form.type) {
            form.type = 'submit';
        }
        return this.sendIq(
            {
                mucOwner: {
                    form: form
                },
                to: jid,
                type: 'set'
            },
            cb
        );
    };

    client.destroyRoom = function(jid, opts, cb) {
        return this.sendIq(
            {
                mucOwner: {
                    destroy: opts
                },
                to: jid,
                type: 'set'
            },
            cb
        );
    };

    client.getUniqueRoomName = function(jid, cb) {
        return this.sendIq(
            {
                mucUnique: true,
                to: jid,
                type: 'get'
            },
            cb
        );
    };
}
