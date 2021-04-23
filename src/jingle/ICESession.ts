import * as SDPUtils from 'sdp';

import { JingleAction, JingleReasonCondition, JingleSessionRole } from '../Constants';
import { NS_JINGLE_ICE_UDP_1 } from '../Namespaces';
import { Jingle, JingleContent, JingleIce, JingleReason } from '../protocol';

import { exportToSDP, importFromSDP } from './sdp/Intermediate';
import {
    convertCandidateToIntermediate,
    convertIntermediateToCandidate,
    convertIntermediateToTransport,
    convertRequestToIntermediate
} from './sdp/Protocol';
import BaseSession, { ActionCallback, SessionOpts } from './Session';
import { SessionManagerConfig } from './SessionManager';

export interface ICESessionOpts extends SessionOpts {
    maxRelayBandwidth?: number;
    iceServers?: RTCIceServer[];
    config?: SessionManagerConfig['peerConnectionConfig'];
    constraints?: SessionManagerConfig['peerConnectionConstraints']
}

export default class ICESession extends BaseSession {
    public pc!: RTCPeerConnection;
    public bitrateLimit = 0;
    public maximumBitrate?: number;
    public currentBitrate?: number;
    public maxRelayBandwidth?: number;
    public candidateBuffer: Array<{
        sdpMid: string;
        candidate: string;
    } | null> = [];
    public transportType: JingleIce['transportType'] = NS_JINGLE_ICE_UDP_1;
    public restartingIce = false;
    public usingRelay = false;

    private _maybeRestartingIce: any;

    constructor(opts: ICESessionOpts) {
        super(opts);

        this.maxRelayBandwidth = opts.maxRelayBandwidth;

        this.pc = this.parent.createPeerConnection(this, {
            ...opts.config,
            iceServers: opts.iceServers
        })!;

        this.pc.oniceconnectionstatechange = () => {
            this.onIceStateChange();
        };

        this.pc.onicecandidate = e => {
            if (e.candidate) {
                this.onIceCandidate(e);
            } else {
                this.onIceEndOfCandidates();
            }
        };

        this.restrictRelayBandwidth();
    }

    public end(reason: JingleReasonCondition | JingleReason = 'success', silent = false): void {
        this.pc.close();
        super.end(reason, silent);
    }

    /* actually do an ice restart */
    public async restartIce(): Promise<void> {
        // only initiators do an ice-restart to avoid conflicts.
        if (!this.isInitiator) {
            return;
        }
        if (this._maybeRestartingIce !== undefined) {
            clearTimeout(this._maybeRestartingIce);
        }

        this.restartingIce = true;
        try {
            await this.processLocal('restart-ice', async () => {
                const offer = await this.pc.createOffer({ iceRestart: true });

                // extract new ufrag / pwd, send transport-info with just that.
                const json = importFromSDP(offer.sdp!);
                this.send(JingleAction.TransportInfo, {
                    contents: json.media.map<JingleContent>(media => ({
                        creator: JingleSessionRole.Initiator,
                        name: media.mid,
                        transport: convertIntermediateToTransport(media, this.transportType)
                    })),
                    sid: this.sid
                });

                await this.pc.setLocalDescription(offer);
            });
        } catch (err) {
            this._log('error', 'Could not create WebRTC offer', err);
            this.end(JingleReasonCondition.FailedTransport, true);
        }
    }

    // set the maximum bitrate. Only supported in Chrome and Firefox right now.
    public async setMaximumBitrate(maximumBitrate: number): Promise<void> {
        if (this.maximumBitrate) {
            // potentially take into account bandwidth restrictions due to using TURN.
            maximumBitrate = Math.min(maximumBitrate, this.maximumBitrate);
        }
        this.currentBitrate = maximumBitrate;

        // changes the maximum bandwidth using RTCRtpSender.setParameters.
        const sender = this.pc.getSenders().find(s => !!s.track && s.track.kind === 'video');
        if (!sender || !sender.getParameters) {
            return;
        }

        try {
            await this.processLocal('set-bitrate', async () => {
                const parameters = sender.getParameters();
                if (!parameters.encodings || !parameters.encodings.length) {
                    parameters.encodings = [{}];
                }

                if (maximumBitrate === 0) {
                    delete parameters.encodings[0].maxBitrate;
                } else {
                    parameters.encodings[0].maxBitrate = maximumBitrate;
                }

                await sender.setParameters(parameters);
            });
        } catch (err) {
            this._log('error', 'Set maximumBitrate failed', err);
        }
    }

    // ----------------------------------------------------------------
    // Jingle action handers
    // ----------------------------------------------------------------

    protected async onTransportInfo(changes: Jingle, cb: ActionCallback): Promise<void> {
        if (
            changes.contents &&
            changes.contents[0] &&
            (changes.contents[0].transport! as JingleIce).gatheringComplete
        ) {
            const candidate = { sdpMid: changes.contents[0].name, candidate: '' };
            try {
                if (this.pc.signalingState === 'stable') {
                    await this.pc.addIceCandidate(candidate);
                } else {
                    this.candidateBuffer.push(candidate);
                }
            } catch (err) {
                this._log('debug', 'Could not add null end-of-candidate');
            } finally {
                cb();
            }
            return;
        }

        // detect an ice restart.
        if (this.pc.remoteDescription) {
            const remoteDescription = this.pc.remoteDescription;
            const remoteJSON = importFromSDP(remoteDescription.sdp);
            const remoteMedia = remoteJSON.media.find(m => m.mid === changes.contents![0].name);
            const currentUsernameFragment = remoteMedia!.iceParameters!.usernameFragment;
            const remoteUsernameFragment = (changes.contents![0].transport! as JingleIce)
                .usernameFragment;
            if (remoteUsernameFragment && currentUsernameFragment !== remoteUsernameFragment) {
                for (const [idx, content] of changes.contents!.entries()) {
                    const transport = content.transport! as JingleIce;
                    remoteJSON.media[idx].iceParameters = {
                        password: transport.password!,
                        usernameFragment: transport.usernameFragment!
                    };
                    remoteJSON.media[idx].candidates = [];
                }
                try {
                    await this.pc.setRemoteDescription({
                        type: remoteDescription.type,
                        sdp: exportToSDP(remoteJSON)
                    });
                    await this.processBufferedCandidates();

                    if (remoteDescription.type === 'offer') {
                        const answer = await this.pc.createAnswer();
                        await this.pc.setLocalDescription(answer);

                        const json = importFromSDP(answer.sdp!);
                        this.send(JingleAction.TransportInfo, {
                            contents: json.media.map(media => ({
                                creator: JingleSessionRole.Initiator,
                                name: media.mid,
                                transport: convertIntermediateToTransport(media, this.transportType)
                            })),
                            sid: this.sid
                        });
                    } else {
                        this.restartingIce = false;
                    }
                } catch (err) {
                    this._log('error', 'Could not do remote ICE restart', err);
                    cb(err);

                    this.end(JingleReasonCondition.FailedTransport);
                    return;
                }
            }
        }

        const all = (changes.contents || []).map(content => {
            const sdpMid = content.name;
            const results = ((content.transport! as JingleIce).candidates || []).map(async json => {
                const candidate = SDPUtils.writeCandidate(convertCandidateToIntermediate(json));
                if (this.pc.remoteDescription && this.pc.signalingState === 'stable') {
                    try {
                        await this.pc.addIceCandidate({ sdpMid, candidate });
                    } catch (err) {
                        this._log('error', 'Could not add ICE candidate', err);
                    }
                } else {
                    this.candidateBuffer.push({ sdpMid, candidate });
                }
            });
            return Promise.all(results);
        });

        try {
            await Promise.all(all);
            cb();
        } catch (err) {
            this._log('error', `Could not process transport-info: ${err}`);
            cb(err);
        }
    }

    protected async onSessionAccept(changes: Jingle, cb: ActionCallback): Promise<void> {
        this.state = 'active';

        const json = convertRequestToIntermediate(changes, this.peerRole);
        const sdp = exportToSDP(json);
        try {
            await this.pc.setRemoteDescription({ type: 'answer', sdp });
            await this.processBufferedCandidates();

            this.parent.emit('accepted', this, undefined);
            cb();
        } catch (err) {
            this._log('error', `Could not process WebRTC answer: ${err}`);
            cb({ condition: 'general-error' });
        }
    }

    protected onSessionTerminate(changes: Jingle, cb: ActionCallback): void {
        this._log('info', 'Terminating session');
        this.pc.close();
        super.end(changes.reason, true);
        cb();
    }

    // ----------------------------------------------------------------
    // ICE action handers
    // ----------------------------------------------------------------

    protected onIceCandidate(e: RTCPeerConnectionIceEvent): void {
        if (!e.candidate || !e.candidate.candidate) {
            return;
        }
        const candidate = SDPUtils.parseCandidate(e.candidate.candidate);
        const jingle: Partial<Jingle> = {
            contents: [
                {
                    creator: JingleSessionRole.Initiator,
                    name: e.candidate.sdpMid!,
                    transport: {
                        candidates: [convertIntermediateToCandidate(candidate)],
                        transportType: this.transportType,
                        usernameFragment: candidate.usernameFragment
                    } as JingleIce
                }
            ]
        };

        this._log('info', 'Discovered new ICE candidate', jingle);
        this.send(JingleAction.TransportInfo, jingle);
    }

    protected onIceEndOfCandidates(): void {
        this._log('info', 'ICE end of candidates');
        const json = importFromSDP(this.pc.localDescription!.sdp);
        const firstMedia = json.media[0];
        // signal end-of-candidates with our first media mid/ufrag
        this.send(JingleAction.TransportInfo, {
            contents: [
                {
                    creator: JingleSessionRole.Initiator,
                    name: firstMedia.mid,
                    transport: {
                        gatheringComplete: true,
                        transportType: this.transportType,
                        usernameFragment: firstMedia.iceParameters!.usernameFragment
                    } as JingleIce
                }
            ]
        });
    }

    protected onIceStateChange(): void {
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
                if (this.restartingIce) {
                    this.end(JingleReasonCondition.FailedTransport);
                    return;
                }
                this.maybeRestartIce();
                break;
            case 'failed':
                if (this.connectionState === 'failed' || this.restartingIce) {
                    this.end(JingleReasonCondition.FailedTransport);
                    return;
                }
                this.connectionState = 'failed';
                this.restartIce();
                break;
            case 'closed':
                this.connectionState = 'disconnected';
                if (this.restartingIce) {
                    this.end(JingleReasonCondition.FailedTransport);
                } else {
                    this.end();
                }
                break;
        }
    }

    protected async processBufferedCandidates(): Promise<void> {
        for (const candidate of this.candidateBuffer) {
            try {
                await this.pc.addIceCandidate(candidate!);
            } catch (err) {
                this._log('error', 'Could not add ICE candidate', err);
            }
        }
        this.candidateBuffer = [];
    }

    /* when using TURN, we might want to restrict the bandwidth
     * to the value specified by MAX_RELAY_BANDWIDTH
     * in order to prevent sending excessive traffic through
     * the TURN server.
     */
    private restrictRelayBandwidth(): void {
        this.pc.addEventListener('iceconnectionstatechange', async () => {
            if (
                this.pc.iceConnectionState !== 'completed' &&
                this.pc.iceConnectionState !== 'connected'
            ) {
                return;
            }

            const stats = await this.pc.getStats();
            let activeCandidatePair: any;
            stats.forEach(report => {
                if (report.type === 'transport') {
                    activeCandidatePair = (stats as any).get(report.selectedCandidatePairId);
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

            if (!activeCandidatePair) {
                return;
            }

            let isRelay = false;
            let localCandidateType = '';
            let remoteCandidateType = '';

            if (activeCandidatePair.remoteCandidateId) {
                const remoteCandidate = (stats as any).get(activeCandidatePair.remoteCandidateId);
                if (remoteCandidate) {
                    remoteCandidateType = remoteCandidate.candidateType;
                }
            }
            if (activeCandidatePair.localCandidateId) {
                const localCandidate = (stats as any).get(activeCandidatePair.localCandidateId);
                if (localCandidate) {
                    localCandidateType = localCandidate.candidateType;
                }
            }

            if (localCandidateType === 'relay' || remoteCandidateType === 'relay') {
                isRelay = true;
            }

            this.usingRelay = isRelay;
            this.parent.emit('iceConnectionType', this, {
                localCandidateType,
                relayed: isRelay,
                remoteCandidateType
            });

            if (isRelay && this.maxRelayBandwidth !== undefined) {
                this.maximumBitrate = this.maxRelayBandwidth;
                if (this.currentBitrate) {
                    this.setMaximumBitrate(Math.min(this.currentBitrate, this.maximumBitrate));
                } else {
                    this.setMaximumBitrate(this.maximumBitrate);
                }
            }
        });
    }

    /* determine whether an ICE restart is in order
     * when transitioning to disconnected. Strategy is
     * 'wait 2 seconds for things to repair themselves'
     * 'maybe check if bytes are sent/received' by comparing
     *   getStats measurements
     */
    private maybeRestartIce(): void {
        // only initiators do an ice-restart to avoid conflicts.
        if (!this.isInitiator) {
            return;
        }
        if (this._maybeRestartingIce !== undefined) {
            clearTimeout(this._maybeRestartingIce);
        }
        this._maybeRestartingIce = setTimeout(() => {
            this._maybeRestartingIce = undefined;
            if (this.pc.iceConnectionState === 'disconnected') {
                this.restartIce();
            }
        }, 2000);
    }
}
