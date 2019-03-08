const SDPUtils = require('sdp');

import {
    convertIntermediateToTransportInfo,
    convertRequestToIntermediate,
    convertIntermediateToTransport
} from './lib/Protocol';
import { importFromSDP, exportToSDP } from './lib/Intermediate';
import BaseSession from './Session';

export default class ICESession extends BaseSession {
    constructor(opts) {
        super(opts);

        this.pc = new RTCPeerConnection(
            {
                ...opts.config,
                ...opts.iceServers
            },
            opts.constraints
        );

        this.pc.addEventListener('iceconnectionstatechange', () => {
            this.onIceStateChange();
            this.restrictRelayBandwidth();
        });

        this.pc.addEventListener('icecandidate', e => {
            if (e.candidate) {
                this.onIceCandidate(e);
            } else {
                this.onIceEndOfCandidates();
            }
        });

        this.bitrateLimit = 0;
        this.maxRelayBandwidth = opts.maxRelayBandwidth;
    }

    end(reason, silent) {
        this.pc.close();
        super.end(reason, silent);
    }

    // ----------------------------------------------------------------
    // Jingle action handers
    // ----------------------------------------------------------------

    onTransportInfo(changes, cb) {
        if (changes.contents[0].transport.gatheringComplete) {
            return this.pc
                .addIceCandidate(null)
                .then(() => cb())
                .catch(e => {
                    this._log('error', 'Could not add null ICE candidate', e.name);
                    cb();
                });
        }
        // detect an ice restart.
        if (this.pc.remoteDescription) {
            const remoteDescription = this.pc.remoteDescription;
            const remoteJSON = importFromSDP(remoteDescription.sdp);
            const remoteMedia = remoteJSON.media.find(m => m.mid === changes.contents[0].name);
            const currentUsernameFragment = remoteMedia.iceParameters.usernameFragment;
            const remoteUsernameFragment = changes.contents[0].transport.ufrag;
            if (remoteUsernameFragment && currentUsernameFragment !== remoteUsernameFragment) {
                changes.contents.forEach((content, idx) => {
                    remoteJSON.media[idx].iceParameters = {
                        password: content.transport.pwd,
                        usernameFragment: content.transport.ufrag
                    };
                    remoteJSON.media[idx].candidates = [];
                });
                if (remoteDescription.type === 'offer') {
                    return this.pc
                        .setRemoteDescription(remoteDescription)
                        .then(() => this.pc.createAnswer())
                        .then(answer => {
                            const json = importFromSDP(answer.sdp);
                            const jingle = {
                                action: 'transport-info',
                                contents: json.media.map(media => {
                                    return {
                                        creator: 'initiator',
                                        name: media.mid,
                                        transport: convertIntermediateToTransport(media)
                                    };
                                }),
                                sessionId: this.sid
                            };
                            this.send('transport-info', jingle);
                            return this.pc.setLocalDescription(answer);
                        })
                        .then(() => cb())
                        .catch(err => {
                            this._log('error', 'Could not do remote ICE restart', err);
                            this.end('failed-application', true);
                            cb(err);
                        });
                }
                return this.pc
                    .setRemoteDescription(remoteDescription)
                    .then(() => cb())
                    .catch(err => {
                        this._log('error', 'Could not do local ICE restart', err);
                        this.end('failed-application', true);
                        cb(err);
                    });
            }
        }

        const all = changes.contents.map(content => {
            const sdpMid = content.name;
            const results = content.transport.candidates.map(json => {
                json.relatedAddress = json.relAddr;
                json.relatedPort = json.relPort;
                const candidate = SDPUtils.writeCandidate(json);

                let sdpMLineIndex;
                // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1456417
                const remoteSDP = this.pc.remoteDescription.sdp;
                const mediaSections = SDPUtils.getMediaSections(remoteSDP);
                for (let i = 0; i < mediaSections.length; i++) {
                    if (SDPUtils.getMid(mediaSections[i]) === candidate.sdpMid) {
                        sdpMLineIndex = i;
                        break;
                    }
                }
                return this.pc
                    .addIceCandidate({ sdpMid, sdpMLineIndex, candidate })
                    .catch(e => this._log('error', 'Could not add ICE candidate', e.name));
            });
            return Promise.all(results);
        });
        return Promise.all(all).then(() => cb());
    }

    onSessionAccept(changes, cb) {
        this.state = 'active';

        const json = convertRequestToIntermediate(changes, this.peerRole);
        const sdp = exportToSDP(json);
        this.pc.setRemoteDescription({ type: 'answer', sdp }).then(
            () => {
                this.emit('accepted', this, undefined);
                cb();
            },
            err => {
                this._log('error', `Could not process WebRTC answer: ${err}`);
                cb({ condition: 'general-error' });
            }
        );
    }

    onSessionTerminate(changes, cb) {
        this._log('info', 'Terminating session');
        this.pc.close();
        super.end(changes.reason, true);
        cb();
    }

    // ----------------------------------------------------------------
    // ICE action handers
    // ----------------------------------------------------------------

    onIceCandidate(e) {
        const candidate = SDPUtils.parseCandidate(e.candidate.candidate);
        const jingle = convertIntermediateToTransportInfo(e.candidate.sdpMid, candidate);
        /* monkeypatch ufrag in Firefox */
        jingle.contents.forEach((content, idx) => {
            if (!content.transport.ufrag) {
                const json = importFromSDP(this.pc.localDescription.sdp);
                content.transport.ufrag = json.media[idx].iceParameters.usernameFragment;
            }
        });

        this._log('info', 'Discovered new ICE candidate', jingle);
        this.send('transport-info', jingle);
    }

    onIceEndOfCandidates() {
        this._log('info', 'ICE end of candidates');
        const json = importFromSDP(this.pc.localDescription.sdp);
        const firstMedia = json.media[0];
        // signal end-of-candidates with our first media mid/ufrag
        const endOfCandidates = {
            contents: [
                {
                    name: firstMedia.mid,
                    transport: {
                        gatheringComplete: true,
                        transportType: 'iceUdp',
                        ufrag: firstMedia.iceParameters.usernameFragment
                    }
                }
            ]
        };
        this.send('transport-info', endOfCandidates);
    }

    onIceStateChange() {
        switch (this.pc.iceConnectionState) {
            case 'checking':
                this.connectionState = 'connecting';
                break;
            case 'completed':
            case 'connected':
                this.connectionState = 'connected';
                break;
            case 'disconnected':
                if (this.pc.signalingState === 'stable') {
                    this.connectionState = 'interrupted';
                } else {
                    this.connectionState = 'disconnected';
                }
                this.maybeRestartIce();
                break;
            case 'failed':
                if (this.connectionState === 'failed') {
                    this.connectionState = 'failed';
                    this.end('failed-transport');
                } else {
                    this.restartIce();
                }
                break;
            case 'closed':
                this.connectionState = 'disconnected';
                break;
        }
    }

    /* when using TURN, we might want to restrict the bandwidth
     * to the value specified by MAX_RELAY_BANDWIDTH
     * in order to prevent sending excessive traffic through
     * the TURN server.
     */
    restrictRelayBandwidth() {
        if (!(window.RTCRtpSender && 'getParameters' in window.RTCRtpSender.prototype)) {
            return;
        }
        this.pc.addEventListener('iceconnectionstatechange', () => {
            switch (this.pc.iceConnectionState) {
                case 'completed':
                case 'connected':
                    if (!this._firstTimeConnected) {
                        this._firstTimeConnected = true;
                        this.pc.getStats().then(stats => {
                            let activeCandidatePair;
                            stats.forEach(report => {
                                if (report.type === 'transport') {
                                    activeCandidatePair = stats.get(report.selectedCandidatePairId);
                                }
                            });
                            // Fallback for Firefox.
                            if (!activeCandidatePair) {
                                stats.forEach(report => {
                                    if (report.type === 'candidate-pair' && report.selected) {
                                        activeCandidatePair = report;
                                    }
                                });
                            }
                            if (activeCandidatePair) {
                                let isRelay = false;
                                if (activeCandidatePair.remoteCandidateId) {
                                    const remoteCandidate = stats.get(
                                        activeCandidatePair.remoteCandidateId
                                    );
                                    if (
                                        remoteCandidate &&
                                        remoteCandidate.candidateType === 'relay'
                                    ) {
                                        isRelay = true;
                                    }
                                }
                                if (activeCandidatePair.localCandidateId) {
                                    const localCandidate = stats.get(
                                        activeCandidatePair.localCandidateId
                                    );
                                    if (
                                        localCandidate &&
                                        localCandidate.candidateType === 'relay'
                                    ) {
                                        isRelay = true;
                                    }
                                }
                                if (isRelay) {
                                    this.maximumBitrate = this.maxRelayBandwidth;
                                    if (this.currentBitrate) {
                                        this.setMaximumBitrate(
                                            Math.min(this.currentBitrate, this.maximumBitrate)
                                        );
                                    }
                                }
                            }
                        });
                    }
                    break;
            }
        });
    }

    /* determine whether an ICE restart is in order
     * when transitioning to disconnected. Strategy is
     * 'wait 2 seconds for things to repair themselves'
     * 'maybe check if bytes are sent/received' by comparing
     *   getStats measurements
     */
    maybeRestartIce() {
        // only initiators do an ice-restart to avoid conflicts.
        if (!this.isInitiator) {
            return;
        }
        if (this._maybeRestartingIce !== undefined) {
            clearTimeout(this._maybeRestartingIce);
        }
        this._maybeRestartingIce = setTimeout(() => {
            delete this._maybeRestartingIce;
            if (this.pc.iceConnectionState === 'disconnected') {
                this.restartIce();
            }
        }, 2000);
    }

    /* actually do an ice restart */
    restartIce() {
        // only initiators do an ice-restart to avoid conflicts.
        if (!this.isInitiator) {
            return;
        }
        if (this._maybeRestartingIce !== undefined) {
            clearTimeout(this._maybeRestartingIce);
        }
        this.pc.createOffer({ iceRestart: true }).then(
            offer => {
                // extract new ufrag / pwd, send transport-info with just that.
                const json = importFromSDP(offer.sdp);
                const jingle = {
                    action: 'transport-info',
                    contents: json.media.map(media => {
                        return {
                            creator: 'initiator',
                            name: media.mid,
                            transport: convertIntermediateToTransport(media)
                        };
                    }),
                    sessionId: this.sid
                };
                this.send('transport-info', jingle);

                return this.pc.setLocalDescription(offer);
            },
            err => {
                this._log('error', 'Could not create WebRTC offer', err);
                this.end('failed-application', true);
            }
        );
    }

    // set the maximum bitrate. Only supported in Chrome and Firefox right now.
    setMaximumBitrate(maximumBitrate) {
        if (this.maximumBitrate) {
            // potentially take into account bandwidth restrictions due to using TURN.
            maximumBitrate = Math.min(maximumBitrate, this.maximumBitrate);
        }
        this.currentBitrate = maximumBitrate;
        if (!(window.RTCRtpSender && 'getParameters' in window.RTCRtpSender.prototype)) {
            return;
        }
        // changes the maximum bandwidth using RTCRtpSender.setParameters.
        const sender = this.pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (!sender) {
            return;
        }

        let browser = '';
        if (window.navigator && window.navigator.mozGetUserMedia) {
            browser = 'firefox';
        } else if (window.navigator && window.navigator.webkitGetUserMedia) {
            browser = 'chrome';
        }

        const parameters = sender.getParameters();
        if (browser === 'firefox' && !parameters.encodings) {
            parameters.encodings = [{}];
        }
        if (maximumBitrate === 0) {
            delete parameters.encodings[0].maximumBitrate;
        } else {
            if (!parameters.encodings.length) {
                parameters.encodings[0] = {};
            }
            parameters.encodings[0].maxBitrate = maximumBitrate;
        }

        if (browser === 'chrome') {
            sender.setParameters(parameters).catch(err => {
                this._log('error', 'setParameters failed', err);
            });
        } else if (browser === 'firefox') {
            // Firefox needs renegotiation:
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1253499
            // but we do not want to intefere with our queue so we
            // just hope this gets picked up.
            if (this.pc.signalingState !== 'stable') {
                sender.setParameters(parameters).catch(err => {
                    this._log('error', 'setParameters failed', err);
                });
            } else if (this.pc.localDescription.type === 'offer') {
                sender
                    .setParameters(parameters)
                    .then(() => this.pc.createOffer())
                    .then(offer => this.pc.setLocalDescription(offer))
                    .then(() => this.pc.setRemoteDescription(this.pc.remoteDescription))
                    .catch(err => {
                        this._log('error', 'setParameters failed', err);
                    });
            } else if (this.pc.localDescription.type === 'answer') {
                sender
                    .setParameters(parameters)
                    .then(() => this.pc.setRemoteDescription(this.pc.remoteDescription))
                    .then(() => this.pc.createAnswer())
                    .then(answer => this.pc.setLocalDescription(answer))
                    .catch(err => {
                        this._log('error', 'setParameters failed', err);
                    });
            }
        }
        // else: not supported.
    }
}
