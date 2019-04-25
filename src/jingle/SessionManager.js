import WildEmitter from '../lib/WildEmitter';

import FileSession from './FileTransferSession';
import MediaSession from './MediaSession';
import BaseSession from './Session';

const MAX_RELAY_BANDWIDTH = 768 * 1024; // maximum bandwidth used via TURN.

export default class SessionManager extends WildEmitter {
    constructor(conf) {
        super();

        conf = conf || {};
        this.selfID = conf.selfID;
        this.sessions = {};
        this.peers = {};
        this.iceServers = conf.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }];

        this.prepareSession =
            conf.prepareSession ||
            function(opts) {
                if (opts.applicationTypes.indexOf('rtp') >= 0) {
                    return new MediaSession(opts);
                }
                if (opts.applicationTypes.indexOf('filetransfer') >= 0) {
                    return new FileSession(opts);
                }
            };

        this.performTieBreak =
            conf.performTieBreak ||
            function(sess, req) {
                const applicationTypes = req.jingle.contents.map(content => {
                    if (content.application) {
                        return content.application.applicationType;
                    }
                });
                const intersection = sess.pendingApplicationTypes.filter(appType =>
                    applicationTypes.includes(appType)
                );
                return intersection.length > 0;
            };

        this.config = {
            debug: false,
            peerConnectionConfig: {
                bundlePolicy: conf.bundlePolicy || 'balanced',
                iceTransportPolicy: conf.iceTransportPolicy || 'all',
                rtcpMuxPolicy: conf.rtcpMuxPolicy || 'require'
            },
            peerConnectionConstraints: {
                optional: [{ DtlsSrtpKeyAgreement: true }, { RtpDataChannels: false }]
            },
            ...conf
        };
    }

    addICEServer(server) {
        // server == {
        //    url: '',
        //    [username: '',]
        //    [credential: '']
        // }
        if (typeof server === 'string') {
            server = { urls: server };
        }
        this.iceServers.push(server);
    }

    resetICEServers() {
        this.iceServers = [];
    }

    addSession(session) {
        const sid = session.sid;
        const peer = session.peerID;
        this.sessions[sid] = session;
        if (!this.peers[peer]) {
            this.peers[peer] = [];
        }
        this.peers[peer].push(session);
        // Automatically clean up tracked sessions
        session.on('terminated', () => {
            const peers = this.peers[peer] || [];
            if (peers.length) {
                peers.splice(peers.indexOf(session), 1);
            }
            delete this.sessions[sid];
        });
        // Proxy session events
        session.on('*', (name, data, ...extraData) => {
            // Listen for when we actually try to start a session to
            // trigger the outgoing event.
            if (name === 'send') {
                const action = data.jingle && data.jingle.action;
                if (session.isInitiator && action === 'session-initiate') {
                    this.emit('outgoing', session);
                }
            }
            if (this.config.debug && (name === 'log:debug' || name === 'log:error')) {
                console.log('Jingle:', data, ...extraData);
            }
            // Don't proxy change:* events, since those don't apply to
            // the session manager itself.
            if (name.indexOf('change') === 0) {
                return;
            }
            this.emit(name, data, ...extraData);
        });
        this.emit('createdSession', session);
        return session;
    }

    createMediaSession(peer, sid, stream) {
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

    createFileTransferSession(peer, sid) {
        const session = new FileSession({
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

    endPeerSessions(peer, reason, silent) {
        peer = peer.full || peer;
        const sessions = this.peers[peer] || [];
        delete this.peers[peer];
        sessions.forEach(function(session) {
            session.end(reason || 'gone', silent);
        });
    }

    endAllSessions(reason, silent) {
        Object.keys(this.peers).forEach(peer => {
            this.endPeerSessions(peer, reason, silent);
        });
    }

    _createIncomingSession(meta, req) {
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

    _sendError(to, id, data) {
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

    _log(level, message, ...args) {
        this.emit('log:' + level, message, ...args);
    }

    process(req) {
        const self = this;
        // Extract the request metadata that we need to verify
        const sid = !!req.jingle ? req.jingle.sid : null;
        let session = this.sessions[sid] || null;
        const rid = req.id;
        const sender = req.from ? req.from.full || req.from : undefined;
        if (req.type === 'error') {
            const isTieBreak = req.error && req.error.jingleCondition === 'tie-break';
            if (session && session.state === 'pending' && isTieBreak) {
                return session.end('alternative-session', true);
            } else {
                if (session) {
                    session.pendingAction = false;
                }
                return this.emit('error', req);
            }
        }
        if (req.type === 'result') {
            if (session) {
                session.pendingAction = false;
            }
            return;
        }
        const action = req.jingle.action;
        const contents = req.jingle.contents || [];
        const applicationTypes = contents.map(function(content) {
            if (content.application) {
                return content.application.applicationType;
            }
        });
        const transportTypes = contents.map(function(content) {
            if (content.transport) {
                return content.transport.transportType;
            }
        });
        // Now verify that we are allowed to actually process the
        // requested action
        if (action !== 'session-initiate') {
            // Can't modify a session that we don't have.
            if (!session) {
                this._log('error', 'Unknown session', sid);
                return this._sendError(sender, rid, {
                    condition: 'item-not-found',
                    jingleCondition: 'unknown-session'
                });
            }
            // Check if someone is trying to hijack a session.
            if (session.peerID !== sender || session.state === 'ended') {
                this._log('error', 'Session has ended, or action has wrong sender');
                return this._sendError(sender, rid, {
                    condition: 'item-not-found',
                    jingleCondition: 'unknown-session'
                });
            }
            // Can't accept a session twice
            if (action === 'session-accept' && session.state !== 'pending') {
                this._log('error', 'Tried to accept session twice', sid);
                return this._sendError(sender, rid, {
                    condition: 'unexpected-request',
                    jingleCondition: 'out-of-order'
                });
            }
            // Can't process two requests at once, need to tie break
            if (action !== 'session-terminate' && action === session.pendingAction) {
                this._log('error', 'Tie break during pending request');
                if (session.isInitiator) {
                    return this._sendError(sender, rid, {
                        condition: 'conflict',
                        jingleCondition: 'tie-break'
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
                if (this.selfID > session.peerID && this.performTieBreak(session, req)) {
                    this._log('error', 'Tie break new session because of duplicate sids');
                    return this._sendError(sender, rid, {
                        condition: 'conflict',
                        jingleCondition: 'tie-break'
                    });
                }
            } else {
                // The other side is just doing it wrong.
                this._log('error', 'Someone is doing this wrong');
                return this._sendError(sender, rid, {
                    condition: 'unexpected-request',
                    jingleCondition: 'out-of-order'
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
                    sess.sid > sid &&
                    this.performTieBreak(sess, req)
                ) {
                    this._log('info', 'Tie break session-initiate');
                    return this._sendError(sender, rid, {
                        condition: 'conflict',
                        jingleCondition: 'tie-break'
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
        session.process(action, req.jingle, err => {
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
}
