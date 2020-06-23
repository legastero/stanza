import { Agent } from '../';
import { MUCAffiliation, MUCRole, MUCStatusCode } from '../Constants';
import * as JID from '../JID';
import { NS_HATS_0, NS_MUC, NS_MUC_DIRECT_INVITE } from '../Namespaces';
import {
    DataForm,
    IQ,
    MUCBookmark,
    MUCConfigure,
    MUCDestroy,
    MUCDirectInvite,
    MUCInvite,
    MUCPresence,
    MUCUnique,
    MUCUserItem,
    MUCUserList,
    Presence,
    ReceivedMessage,
    ReceivedMUCPresence,
    ReceivedPresence
} from '../protocol';
import { uuid } from '../Utils';

declare module '../' {
    export interface Agent {
        joinedRooms: Map<string, string>;
        joiningRooms: Map<string, string>;
        leavingRooms: Map<string, string>;

        joinRoom(jid: string, nick: string, opts?: Presence): Promise<ReceivedMUCPresence>;
        leaveRoom(jid: string, nick?: string, opts?: Presence): Promise<ReceivedPresence>;
        ban(jid: string, occupant: string, reason?: string): Promise<IQ & { muc: MUCUserList }>;
        kick(jid: string, nick: string, reason?: string): Promise<IQ & { muc: MUCUserList }>;
        invite(room: string, invites: MUCInvite | MUCInvite[]): void;
        directInvite(room: string, to: string, opts?: Partial<MUCDirectInvite>): void;
        declineInvite(room: string, sender: string, reason?: string): void;
        changeNick(room: string, nick: string): Promise<ReceivedMUCPresence>;
        setSubject(room: string, subject: string): void;
        getReservedNick(room: string): Promise<string>;
        requestRoomVoice(room: string): void;
        setRoomAffiliation(
            room: string,
            jid: string,
            affiliation: MUCAffiliation,
            reason?: string
        ): Promise<IQ & { muc: MUCUserList }>;
        setRoomRole(
            room: string,
            nick: string,
            role: MUCRole,
            reason?: string
        ): Promise<IQ & { muc: MUCUserList }>;
        getRoomMembers(room: string, opts?: MUCUserItem): Promise<IQ & { muc: MUCUserList }>;
        getRoomConfig(room: string): Promise<DataForm>;
        configureRoom(room: string, form: Partial<DataForm>): Promise<IQ & { muc: MUCConfigure }>;
        destroyRoom(room: string, opts?: MUCDestroy): Promise<IQ & { muc: MUCConfigure }>;
        getUniqueRoomName(mucHost: string): Promise<string>;
        getBookmarks(): Promise<MUCBookmark[]>;
        setBookmarks(bookmarks: MUCBookmark[]): Promise<IQ>;
        addBookmark(bookmark: MUCBookmark): Promise<IQ>;
        removeBookmark(jid: string): Promise<IQ>;
    }

    export interface AgentEvents {
        'muc:topic': MUCTopicEvent;
        'muc:invite': MUCInviteEvent;
        'muc:other': ReceivedMessage;
        'muc:declined': MUCDeclinedEvent;
        'muc:failed': Presence;
        'muc:error': Presence;
        'muc:available': ReceivedMUCPresence;
        'muc:unavailable': ReceivedMUCPresence;
        'muc:destroyed': MUCDestroyedEvent;
        'muc:leave': ReceivedMUCPresence;
        'muc:join': ReceivedMUCPresence;
    }
}

export interface MUCTopicEvent {
    topic?: string;
    room: string;
    from: string;
}
export interface MUCInviteEvent {
    from: string;
    password?: string;
    reason?: string;
    room: string;
    thread?: string;
    type: 'direct' | 'mediated';
}
export interface MUCDeclinedEvent {
    from: string;
    reason?: string;
    room: string;
}
export interface MUCDestroyedEvent {
    newRoom?: string;
    password?: string;
    reason?: string;
    room: string;
}

function isMUCPresence(pres: ReceivedPresence): pres is ReceivedMUCPresence {
    return !!pres.muc;
}

export default function (client: Agent) {
    client.disco.addFeature(NS_MUC);
    client.disco.addFeature(NS_MUC_DIRECT_INVITE);
    client.disco.addFeature(NS_HATS_0);

    client.joinedRooms = new Map();
    client.joiningRooms = new Map();
    client.leavingRooms = new Map();

    function rejoinRooms() {
        const oldJoiningRooms = client.joiningRooms;
        client.joiningRooms = new Map();
        for (const [room, nick] of oldJoiningRooms) {
            client.joinRoom(room, nick);
        }

        const oldJoinedRooms = client.joinedRooms;
        client.joinedRooms = new Map();
        for (const [room, nick] of oldJoinedRooms) {
            client.joinRoom(room, nick);
        }
    }
    client.on('session:started', rejoinRooms);
    client.on('stream:management:resumed', rejoinRooms);

    client.on('message', msg => {
        if (msg.type === 'groupchat' && msg.hasSubject) {
            client.emit('muc:topic', {
                from: msg.from,
                room: JID.toBare(msg.from),
                topic: msg.subject || ''
            });
            return;
        }

        if (!msg.muc) {
            return;
        }

        if (msg.muc.type === 'direct-invite' || (!msg.muc.invite && msg.legacyMUC)) {
            const invite = msg.muc.type === 'direct-invite' ? msg.muc : msg.legacyMUC!;
            client.emit('muc:invite', {
                from: msg.from,
                password: invite.password,
                reason: invite.reason,
                room: invite.jid!,
                thread: invite.thread,
                type: 'direct'
            });
            return;
        }

        if (msg.muc.invite) {
            client.emit('muc:invite', {
                from: msg.muc.invite[0].from!,
                password: msg.muc.password,
                reason: msg.muc.invite[0].reason,
                room: msg.from,
                thread: msg.muc.invite[0].thread,
                type: 'mediated'
            });
            return;
        }

        if (msg.muc.decline) {
            client.emit('muc:declined', {
                from: msg.muc.decline.from!,
                reason: msg.muc.decline.reason,
                room: msg.from
            });
            return;
        }

        client.emit('muc:other', msg);
    });

    client.on('presence', pres => {
        const room = JID.toBare(pres.from);

        if (client.joiningRooms.has(room) && pres.type === 'error') {
            client.joiningRooms.delete(room);
            client.emit('muc:failed', pres);
            client.emit('muc:error', pres);
            return;
        }

        if (!isMUCPresence(pres)) {
            return;
        }

        const isSelf =
            pres.muc.statusCodes && pres.muc.statusCodes.indexOf(MUCStatusCode.SelfPresence) >= 0;
        const isNickChange =
            pres.muc.statusCodes && pres.muc.statusCodes.indexOf(MUCStatusCode.NickChanged) >= 0;

        if (pres.type === 'error') {
            client.emit('muc:error', pres);
            return;
        }
        if (pres.type === 'unavailable') {
            client.emit('muc:unavailable', pres);
            if (isSelf) {
                if (isNickChange) {
                    client.joinedRooms.set(room, pres.muc.nick!);
                } else {
                    client.emit('muc:leave', pres);
                    client.joinedRooms.delete(room);
                    client.leavingRooms.delete(room);
                }
            }
            if (pres.muc.destroy) {
                client.emit('muc:destroyed', {
                    newRoom: pres.muc.destroy.jid,
                    password: pres.muc.destroy.password,
                    reason: pres.muc.destroy.reason,
                    room
                });
            }
            return;
        }

        client.emit('muc:available', pres);
        const isJoin = client.joiningRooms.has(room) || !client.joinedRooms.has(room);
        if (isSelf) {
            client.joinedRooms.set(room, JID.getResource(pres.from)!);
            if (isJoin) {
                client.joiningRooms.delete(room);
                client.emit('muc:join', pres);
            }
        }
    });

    client.joinRoom = async (
        room: string,
        nick?: string,
        opts: MUCPresence = {}
    ): Promise<ReceivedMUCPresence> => {
        room = JID.toBare(room);
        client.joiningRooms.set(room, nick || '');

        if (!nick) {
            try {
                nick = await client.getReservedNick(room);
                client.joiningRooms.set(room, nick!);
            } catch (err) {
                throw new Error('Room nick required');
            }
        }

        return new Promise((resolve, reject) => {
            function joined(pres: ReceivedMUCPresence) {
                if (JID.equalBare(pres.from, room)) {
                    client.off('muc:join', joined);
                    client.off('muc:failed', failed);
                    resolve(pres);
                }
            }
            function failed(pres: Presence) {
                if (JID.equalBare(pres.from, room)) {
                    client.off('muc:join', joined);
                    client.off('muc:failed', failed);
                    reject(pres);
                }
            }

            client.on('muc:join', joined);
            client.on('muc:failed', failed);

            client.sendPresence({
                ...opts,
                muc: {
                    ...opts.muc,
                    type: 'join'
                },
                to: JID.createFull(room, nick)
            });
        });
    };

    client.leaveRoom = (
        room: string,
        nick?: string,
        opts: Presence = {}
    ): Promise<ReceivedPresence> => {
        room = JID.toBare(room);
        nick = nick || client.joinedRooms.get(room)!;

        client.leavingRooms.set(room, nick);

        return new Promise((resolve, reject) => {
            const id = opts.id || uuid();
            const allowed = JID.allowedResponders(room);

            function leave(pres: ReceivedMUCPresence) {
                if (JID.equalBare(pres.from, room)) {
                    client.off('muc:leave', leave);
                    client.off('presence:error', leaveError);
                    resolve(pres);
                }
            }
            function leaveError(pres: Presence) {
                if (pres.id === id && allowed.has(pres.from)) {
                    if (!client.joinedRooms.has(room)) {
                        client.leavingRooms.delete(room);
                    }

                    client.off('muc:leave', leave);
                    client.off('presence:error', leaveError);
                    reject(pres);
                }
            }

            client.on('muc:leave', leave);
            client.on('presence:error', leaveError);

            client.sendPresence({
                ...opts,
                id,
                to: JID.createFull(room, nick),
                type: 'unavailable'
            });
        });
    };

    client.ban = (room: string, occupantRealJID: string, reason?: string) => {
        return client.setRoomAffiliation(room, occupantRealJID, 'outcast', reason);
    };

    client.kick = (room: string, nick: string, reason?: string) => {
        return client.setRoomRole(room, nick, 'none', reason);
    };

    client.invite = (room: string, opts: MUCInvite | MUCInvite[] = []) => {
        if (!Array.isArray(opts)) {
            opts = [opts];
        }
        client.sendMessage({
            muc: {
                invite: opts,
                type: 'info'
            },
            to: room
        });
    };

    client.directInvite = (room: string, to: string, opts: Partial<MUCDirectInvite> = {}) => {
        client.sendMessage({
            muc: {
                ...opts,
                jid: room,
                type: 'direct-invite'
            },
            to
        });
    };

    client.declineInvite = (room: string, sender: string, reason?: string) => {
        client.sendMessage({
            muc: {
                decline: {
                    reason,
                    to: sender
                },
                type: 'info'
            },
            to: room
        });
    };

    client.changeNick = (room: string, nick: string): Promise<ReceivedMUCPresence> => {
        const id = uuid();
        const newJID = JID.createFull(room, nick);
        const allowed = JID.allowedResponders(room);

        return new Promise((resolve, reject) => {
            function success(pres: ReceivedMUCPresence) {
                if (!allowed.has(JID.toBare(pres.from))) {
                    return;
                }
                if (
                    !pres.muc.statusCodes ||
                    !pres.muc.statusCodes.includes(MUCStatusCode.SelfPresence)
                ) {
                    return;
                }

                client.off('muc:available', success);
                client.off(`presence:id:${id}` as any, errorOrNoChange);
                resolve(pres);
            }
            function errorOrNoChange(pres: ReceivedPresence) {
                if (!allowed.has(JID.toBare(pres.from)) || pres.id !== id) {
                    return;
                }

                client.off('muc:available', success);
                client.off(`presence:id:${id}` as any, errorOrNoChange);

                if (pres.type === 'error') {
                    reject(pres);
                } else {
                    resolve(pres as ReceivedMUCPresence);
                }
            }

            client.on('muc:available', success);
            client.on(`presence:id:${id}` as any, errorOrNoChange);

            client.sendPresence({
                id,
                to: newJID
            });
        });
    };

    client.setSubject = (room: string, subject: string) => {
        client.sendMessage({
            subject,
            to: room,
            type: 'groupchat'
        });
    };

    client.getReservedNick = async (room: string) => {
        try {
            const info = await client.getDiscoInfo(room, 'x-roomuser-item');
            const identity = info.identities[0];
            if (identity.name) {
                return identity.name;
            } else {
                throw new Error('No nickname reserved');
            }
        } catch (err) {
            throw new Error('No nickname reserved');
        }
    };

    client.requestRoomVoice = (room: string) => {
        client.sendMessage({
            forms: [
                {
                    fields: [
                        {
                            name: 'FORM_TYPE',
                            type: 'hidden',
                            value: 'http://jabber.org/protocol/muc#request'
                        },
                        {
                            name: 'muc#role',
                            type: 'text-single',
                            value: 'participant'
                        }
                    ],
                    type: 'submit'
                }
            ],
            to: room
        });
    };

    client.setRoomAffiliation = (
        room: string,
        occupantRealJID: string,
        affiliation: MUCAffiliation,
        reason?: string
    ) => {
        return client.sendIQ({
            muc: {
                type: 'user-list',
                users: [
                    {
                        affiliation,
                        jid: occupantRealJID,
                        reason
                    }
                ]
            },
            to: room,
            type: 'set'
        });
    };

    client.setRoomRole = (room: string, nick: string, role: MUCRole, reason?: string) => {
        return client.sendIQ({
            muc: {
                type: 'user-list',
                users: [
                    {
                        nick,
                        reason,
                        role
                    }
                ]
            },
            to: room,
            type: 'set'
        });
    };

    client.getRoomMembers = (room: string, opts: MUCUserItem = { affiliation: 'member' }) => {
        return client.sendIQ({
            muc: {
                type: 'user-list',
                users: [opts]
            },
            to: room,
            type: 'get'
        });
    };

    client.getRoomConfig = async (room: string) => {
        const result = await client.sendIQ({
            muc: {
                type: 'configure'
            } as MUCConfigure,
            to: room,
            type: 'get'
        });
        if (!result.muc.form) {
            throw new Error('No configuration form returned');
        }
        return result.muc.form;
    };

    client.configureRoom = (room: string, form: Partial<DataForm> = {}) => {
        return client.sendIQ({
            muc: {
                form: {
                    ...form,
                    type: 'submit'
                },
                type: 'configure'
            },
            to: room,
            type: 'set'
        });
    };

    client.destroyRoom = (room: string, opts: MUCDestroy = {}) => {
        return client.sendIQ({
            muc: {
                destroy: opts,
                type: 'configure'
            },
            to: room,
            type: 'set'
        });
    };

    client.getUniqueRoomName = async function (mucHost: string) {
        const result = await this.sendIQ({
            muc: {
                type: 'unique'
            } as MUCUnique,
            to: mucHost,
            type: 'get'
        });
        if (!result.muc.name) {
            throw new Error('No unique name returned');
        }
        return result.muc.name;
    };

    client.getBookmarks = async () => {
        const res = await client.getPrivateData('bookmarks');
        if (!res || !res.rooms) {
            return [];
        }
        return res.rooms;
    };

    client.setBookmarks = (bookmarks: MUCBookmark[]) => {
        return client.setPrivateData('bookmarks', {
            rooms: bookmarks
        });
    };

    client.addBookmark = async (bookmark: MUCBookmark) => {
        const mucs = await client.getBookmarks();
        const updated: MUCBookmark[] = [];

        let updatedExisting = false;
        for (const muc of mucs) {
            if (JID.equalBare(muc.jid, bookmark.jid)) {
                updated.push({
                    ...muc,
                    ...bookmark
                });
                updatedExisting = true;
            } else {
                updated.push(muc);
            }
        }
        if (!updatedExisting) {
            updated.push(bookmark);
        }

        return client.setBookmarks(updated);
    };

    client.removeBookmark = async (jid: string) => {
        const existingMucs = await client.getBookmarks();
        const updated = existingMucs.filter(muc => {
            return !JID.equalBare(muc.jid, jid);
        });
        return client.setBookmarks(updated);
    };
}
