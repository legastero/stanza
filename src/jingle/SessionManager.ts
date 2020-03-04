import { EventEmitter } from 'events';
import { RTCPeerConnection } from 'stanza-shims';

import { JingleAction, JingleReasonCondition } from '../Constants';
import { NS_JINGLE_FILE_TRANSFER_5, NS_JINGLE_RTP_1 } from '../Namespaces';
import { IQ, Jingle, JingleReason, StanzaError } from '../protocol';
import { octetCompare } from '../Utils';

import FileTransferSession from './FileTransferSession';
import MediaSession from './MediaSession';
import BaseSession from './Session';

const MAX_RELAY_BANDWIDTH = 768 * 1024; // maximum bandwidth used via TURN.

export interface SessionManagerConfig {
    debug?: boolean;
    selfID?: string;
    bundlePolicy?: string;
    iceTransportPolicy?: string;
    rtcpMuxPolicy?: string;
    iceServers?: RTCIceServer[];
    sdpSemantics?: string;
    peerConnectionConfig?: {
        bundlePolicy?: string;
        iceTransportPolicy?: string;
        rtcpMuxPolicy?: string;
        sdpSemantics?: string;
    };
    hasRTCPeerConnection?: boolean;
    peerConnectionConstraints?: any;
    performTieBreak?: (session: BaseSession, req: IQ & { jingle: Jingle }) => boolean;
    prepareSession?: (opts: any, req?: IQ & { jingle: Jingle }) => BaseSession | undefined;
    createPeerConnection?: () => RTCPeerConnection | undefined;
}

export default class SessionManager extends EventEmitter {
    public selfID?: string;
    public sessions: { [key: string]: BaseSession };
    public peers: { [key: string]: BaseSession[] };
    public iceServers: RTCIceServer[];
    public config: SessionManagerConfig;

    public performTieBreak: (session: BaseSession, req: IQ & { jingle: Jingle }) => boolean;
    public prepareSession: (opts: any, req?: IQ & { jingle: Jingle }) => BaseSession | undefined;
    public createPeerConnection: (opts?: RTCConfiguration) => RTCPeerConnection | undefined;

    constructor(conf: SessionManagerConfig = {}) {
        super();

        conf = conf || {};
        this.selfID = conf.selfID;
        this.sessions = {};
        this.peers = {};
        this.iceServers = conf.iceServers || [];

        this.prepareSession =
            conf.prepareSession ||
            (opts => {
                if (!this.config.hasRTCPeerConnection) {
                    return;
                }
                if (opts.applicationTypes.indexOf(NS_JINGLE_RTP_1) >= 0) {
                    return new MediaSession(opts);
                }
                if (opts.applicationTypes.indexOf(NS_JINGLE_FILE_TRANSFER_5) >= 0) {
                    return new FileTransferSession(opts);
                }
            });

        this.performTieBreak =
            conf.performTieBreak ||
            ((sess, req) => {
                const applicationTypes = (req.jingle.contents || []).map(content => {
                    if (content.application) {
                        return content.application.applicationType;
                    }
                });
                const intersection = (sess.pendingApplicationTypes || []).filter(appType =>
                    applicationTypes.includes(appType)
                );
                return intersection.length > 0;
            });

        this.createPeerConnection =
            conf.createPeerConnection ||
            ((opts?: RTCConfiguration) => {
                if (!!RTCPeerConnection) {
                    return new (RTCPeerConnection as any)(opts);
                }
            });

        this.config = {
            debug: false,
            hasRTCPeerConnection: !!RTCPeerConnection,
            peerConnectionConfig: {
                bundlePolicy: conf.bundlePolicy || 'balanced',
                iceTransportPolicy: conf.iceTransportPolicy || 'all',
                rtcpMuxPolicy: conf.rtcpMuxPolicy || 'require',
                sdpSemantics: conf.sdpSemantics || 'plan-b'
            },
            peerConnectionConstraints: {
                optional: [{ DtlsSrtpKeyAgreement: true }, { RtpDataChannels: false }]
            },
            ...conf
        };
    }

    public addICEServer(server: RTCIceServer | string): void {
        if (typeof server === 'string') {
            server = { urls: server };
        }
        this.iceServers.push(server);
    }

    public resetICEServers(): void {
        this.iceServers = [];
    }

    public addSession<T extends BaseSession = BaseSession>(session: T): T {
        session.parent = this;
        const sid = session.sid;
        const peer = session.peerID;
        this.sessions[sid] = session;
        if (!this.peers[peer]) {
            this.peers[peer] = [];
        }
        this.peers[peer].push(session);
        this.emit('createdSession', session);
        return session;
    }

    public forgetSession(session: BaseSession): void {
        const peers = this.peers[session.peerID] || [];
        if (peers.length) {
            peers.splice(peers.indexOf(session), 1);
        }
        delete this.sessions[session.sid];
    }

    public createMediaSession(peer: string, sid?: string, stream?: MediaStream): MediaSession {
        const session = new MediaSession({
            config: this.config.peerConnectionConfig,
            constraints: this.config.peerConnectionConstraints,
            iceServers: this.iceServers,
            initiator: true,
            maxRelayBandwidth: MAX_RELAY_BANDWIDTH,
            parent: this,
            peerID: peer,
            sid,
            stream
        });
        this.addSession(session);
        return session;
    }

    public createFileTransferSession(peer: string, sid?: string): FileTransferSession {
        const session = new FileTransferSession({
            config: this.config.peerConnectionConfig,
            constraints: this.config.peerConnectionConstraints,
            iceServers: this.iceServers,
            initiator: true,
            maxRelayBandwidth: MAX_RELAY_BANDWIDTH,
            parent: this,
            peerID: peer,
            sid
        });
        this.addSession(session);
        return session;
    }

    public endPeerSessions(
        peer: string,
        reason?: JingleReasonCondition | JingleReason,
        silent: boolean = false
    ) {
        const sessions = this.peers[peer] || [];
        delete this.peers[peer];
        sessions.forEach(session => {
            session.end(reason || 'gone', silent);
        });
    }

    public endAllSessions(reason?: JingleReasonCondition | JingleReason, silent: boolean = false) {
        Object.keys(this.peers).forEach(peer => {
            this.endPeerSessions(peer, reason, silent);
        });
    }

    public process(req: IQ & { jingle: Jingle }): void {
        const self = this;
        // Extract the request metadata that we need to verify
        const sid = !!req.jingle ? req.jingle.sid : undefined;
        let session = sid ? this.sessions[sid] : undefined;
        const rid = req.id!;
        const sender = req.from;

        if (!sender) {
            return;
        }
        if (req.type === 'error') {
            const isTieBreak = req.error && req.error.jingleError === 'tie-break';
            if (session && session.state === 'pending' && isTieBreak) {
                return session.end('alternative-session', true);
            } else {
                if (session) {
                    session.pendingAction = undefined;
                }
                return;
            }
        }
        if (req.type === 'result') {
            if (session) {
                session.pendingAction = undefined;
            }
            return;
        }
        const action = req.jingle.action!;
        const contents = req.jingle.contents || [];
        const applicationTypes = contents.map(content => {
            return content.application ? content.application.applicationType : undefined;
        });
        const transportTypes = contents.map(content => {
            return content.transport ? content.transport.transportType : undefined;
        });
        // Now verify that we are allowed to actually process the
        // requested action
        if (action !== JingleAction.SessionInitiate) {
            // Can't modify a session that we don't have.
            if (!session) {
                if (action === 'session-terminate') {
                    this.emit('send', {
                        id: rid,
                        to: sender,
                        type: 'result'
                    });
                    return;
                }
                this._log('error', 'Unknown session', sid);
                return this._sendError(sender, rid, {
                    condition: 'item-not-found',
                    jingleError: 'unknown-session'
                });
            }
            // Check if someone is trying to hijack a session.
            if (session.peerID !== sender || session.state === 'ended') {
                this._log('error', 'Session has ended, or action has wrong sender');
                return this._sendError(sender, rid, {
                    condition: 'item-not-found',
                    jingleError: 'unknown-session'
                });
            }
            // Can't accept a session twice
            if (action === 'session-accept' && session.state !== 'pending') {
                this._log('error', 'Tried to accept session twice', sid);
                return this._sendError(sender, rid, {
                    condition: 'unexpected-request',
                    jingleError: 'out-of-order'
                });
            }
            // Can't process two requests at once, need to tie break
            if (action !== 'session-terminate' && action === session.pendingAction) {
                this._log('error', 'Tie break during pending request');
                if (session.isInitiator) {
                    return this._sendError(sender, rid, {
                        condition: 'conflict',
                        jingleError: 'tie-break'
                    });
                }
            }
        } else if (session) {
            // Don't accept a new session if we already have one.
            if (session.peerID !== sender) {
                this._log('error', 'Duplicate sid from new sender');
                return this._sendError(sender, rid, {
                    condition: 'service-unavailable'
                });
            }
            // Check if we need to have a tie breaker because both parties
            // happened to pick the same random sid.
            if (session.state === 'pending') {
                if (
                    this.selfID &&
                    this.selfID > session.peerID &&
                    this.performTieBreak(session, req)
                ) {
                    this._log('error', 'Tie break new session because of duplicate sids');
                    return this._sendError(sender, rid, {
                        condition: 'conflict',
                        jingleError: 'tie-break'
                    });
                }
            } else {
                // The other side is just doing it wrong.
                this._log('error', 'Someone is doing this wrong');
                return this._sendError(sender, rid, {
                    condition: 'unexpected-request',
                    jingleError: 'out-of-order'
                });
            }
        } else if (this.peers[sender] && this.peers[sender].length) {
            // Check if we need to have a tie breaker because we already have
            // a different session with this peer that is using the requested
            // content application types.
            for (let i = 0, len = this.peers[sender].length; i < len; i++) {
                const sess = this.peers[sender][i];
                if (
                    sess &&
                    sess.state === 'pending' &&
                    sid &&
                    octetCompare(sess.sid, sid) > 0 &&
                    this.performTieBreak(sess, req)
                ) {
                    this._log('info', 'Tie break session-initiate');
                    return this._sendError(sender, rid, {
                        condition: 'conflict',
                        jingleError: 'tie-break'
                    });
                }
            }
        }
        // We've now weeded out invalid requests, so we can process the action now.
        if (action === 'session-initiate') {
            if (!contents.length) {
                return self._sendError(sender, rid, {
                    condition: 'bad-request'
                });
            }
            session = this._createIncomingSession(
                {
                    applicationTypes,
                    config: this.config.peerConnectionConfig,
                    constraints: this.config.peerConnectionConstraints,
                    iceServers: this.iceServers,
                    initiator: false,
                    parent: this,
                    peerID: sender,
                    sid,
                    transportTypes
                },
                req
            );
        }
        session!.process(action, req.jingle, (err: any) => {
            if (err) {
                this._log('error', 'Could not process request', req, err);
                this._sendError(sender, rid, err);
            } else {
                this.emit('send', {
                    id: rid,
                    to: sender,
                    type: 'result'
                });
                // Wait for the initial action to be processed before emitting
                // the session for the user to accept/reject.
                if (action === 'session-initiate') {
                    this.emit('incoming', session);
                }
            }
        });
    }

    public signal(session: BaseSession, data: IQ & { jingle: Jingle }): void {
        const action = data.jingle && data.jingle.action;
        if (session.isInitiator && action === JingleAction.SessionInitiate) {
            this.emit('outgoing', session);
        }
        this.emit('send', data);
    }

    private _createIncomingSession(meta: any, req: IQ & { jingle: Jingle }) {
        let session;
        if (this.prepareSession) {
            session = this.prepareSession(meta, req);
        }
        // Fallback to a generic session type, which can
        // only be used to end the session.
        if (!session) {
            session = new BaseSession(meta);
        }
        this.addSession(session);
        return session;
    }

    private _sendError(to: string, id: string, data: StanzaError) {
        if (!data.type) {
            data.type = 'cancel';
        }
        this.emit('send', {
            error: data,
            id,
            to,
            type: 'error'
        });
    }

    private _log(level: string, message: string, ...args: any[]) {
        this.emit('log', level, message, ...args);
        this.emit('log:' + level, message, ...args);
    }
}
