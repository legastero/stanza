import {
    JINGLE_INFO_ACTIVE,
    JINGLE_INFO_HOLD,
    JINGLE_INFO_MUTE,
    JINGLE_INFO_RINGING,
    JINGLE_INFO_UNHOLD,
    JINGLE_INFO_UNMUTE,
    JingleAction,
    JingleReasonCondition,
    JingleSessionRole
} from '../Constants';
import {
    Jingle,
    JingleContent,
    JingleIce,
    JingleInfo,
    JingleReason,
    JingleRtpDescription
} from '../protocol';

import ICESession from './ICESession';
import { exportToSDP, importFromSDP } from './sdp/Intermediate';
import { convertIntermediateToRequest, convertRequestToIntermediate } from './sdp/Protocol';
import { ActionCallback } from './Session';

function applyStreamsCompatibility(content: JingleContent) {
    const application = content.application as JingleRtpDescription;

    /* signal .streams as a=ssrc: msid */
    if (
        application.streams &&
        application.streams.length &&
        application.sources &&
        application.sources.length
    ) {
        const msid = application.streams[0];
        application.sources[0].parameters.msid = `${msid.id} ${msid.track}`;
        if (application.sourceGroups && application.sourceGroups.length > 0) {
            application.sources.push({
                parameters: {
                    cname: application.sources[0].parameters.cname,
                    msid: `${msid.id} ${msid.track}`
                },
                ssrc: application.sourceGroups[0].sources[1]
            });
        }
    }
}

export default class MediaSession extends ICESession {
    public offerOptions: any;

    public includesAudio: boolean = false;
    public includesVideo: boolean = false;

    private _ringing: boolean = false;

    constructor(opts: any) {
        super(opts);

        this.pc.addEventListener('track', (e: RTCTrackEvent) => {
            this.onAddTrack(e.track, e.streams[0]);
        });

        if (opts.stream) {
            for (const track of opts.stream.getTracks()) {
                this.addTrack(track, opts.stream);
            }
        }
    }

    public get ringing(): boolean {
        return this._ringing;
    }
    public set ringing(value) {
        if (value !== this._ringing) {
            this._ringing = value;
        }
    }

    public get streams(): MediaStream[] {
        if (this.pc.signalingState !== 'closed') {
            return (this.pc as any).getRemoteStreams();
        }
        return [];
    }

    // ----------------------------------------------------------------
    // Session control methods
    // ----------------------------------------------------------------

    public async start(opts?: RTCOfferOptions | ActionCallback, next?: ActionCallback) {
        this.state = 'pending';

        if (arguments.length === 1 && typeof opts === 'function') {
            next = opts;
            opts = {};
        }
        next = next || (() => undefined);
        opts = opts || {};

        this.role = 'initiator';
        this.offerOptions = opts;

        try {
            await this.processLocal(JingleAction.SessionInitiate, async () => {
                const offer = await this.pc.createOffer(opts as RTCOfferOptions);
                const json = importFromSDP(offer.sdp!);
                const jingle = convertIntermediateToRequest(json, this.role, this.transportType);
                jingle.sid = this.sid;
                jingle.action = JingleAction.SessionInitiate;
                for (const content of jingle.contents || []) {
                    content.creator = 'initiator';
                    applyStreamsCompatibility(content);
                }
                await this.pc.setLocalDescription(offer);

                this.send('session-initiate', jingle);
            });

            next();
        } catch (err) {
            this._log('error', 'Could not create WebRTC offer', err);
            this.end('failed-application', true);
        }
    }

    public async accept(opts?: RTCAnswerOptions | ActionCallback, next?: ActionCallback) {
        // support calling with accept(next) or accept(opts, next)
        if (arguments.length === 1 && typeof opts === 'function') {
            next = opts;
            opts = {};
        }
        next = next || (() => undefined);
        opts = opts || {};

        this._log('info', 'Accepted incoming session');

        this.state = 'active';
        this.role = 'responder';

        try {
            await this.processLocal(JingleAction.SessionAccept, async () => {
                const answer = await this.pc.createAnswer(opts as RTCAnswerOptions);

                const json = importFromSDP(answer.sdp!);
                const jingle = convertIntermediateToRequest(json, this.role, this.transportType);
                jingle.sid = this.sid;
                jingle.action = JingleAction.SessionAccept;
                for (const content of jingle.contents || []) {
                    content.creator = 'initiator';
                }
                await this.pc.setLocalDescription(answer);
                await this.processBufferedCandidates();

                this.send('session-accept', jingle);
            });

            next();
        } catch (err) {
            this._log('error', 'Could not create WebRTC answer', err);
            this.end('failed-application');
        }
    }

    public end(reason: JingleReasonCondition | JingleReason = 'success', silent: boolean = false) {
        for (const receiver of this.pc.getReceivers()) {
            this.onRemoveTrack(receiver.track);
        }
        super.end(reason, silent);
    }

    public ring(): Promise<void> {
        return this.processLocal('ring', async () => {
            this._log('info', 'Ringing on incoming session');
            this.ringing = true;
            this.send(JingleAction.SessionInfo, {
                info: {
                    infoType: JINGLE_INFO_RINGING
                }
            });
        });
    }

    public mute(creator: JingleSessionRole, name?: string): Promise<void> {
        return this.processLocal('mute', async () => {
            this._log('info', 'Muting', name);

            this.send(JingleAction.SessionInfo, {
                info: {
                    creator,
                    infoType: JINGLE_INFO_MUTE,
                    name
                }
            });
        });
    }

    public unmute(creator: JingleSessionRole, name?: string): Promise<void> {
        return this.processLocal('unmute', async () => {
            this._log('info', 'Unmuting', name);
            this.send(JingleAction.SessionInfo, {
                info: {
                    creator,
                    infoType: JINGLE_INFO_UNMUTE,
                    name
                }
            });
        });
    }

    public hold(): Promise<void> {
        return this.processLocal('hold', async () => {
            this._log('info', 'Placing on hold');
            this.send('session-info', {
                info: {
                    infoType: JINGLE_INFO_HOLD
                }
            });
        });
    }

    public resume(): Promise<void> {
        return this.processLocal('resume', async () => {
            this._log('info', 'Resuming from hold');
            this.send('session-info', {
                info: {
                    infoType: JINGLE_INFO_ACTIVE
                }
            });
        });
    }

    // ----------------------------------------------------------------
    // Track control methods
    // ----------------------------------------------------------------

    public addTrack(track: MediaStreamTrack, stream: MediaStream, cb?: ActionCallback) {
        if (track.kind === 'audio') {
            this.includesAudio = true;
        }
        if (track.kind === 'video') {
            this.includesVideo = true;
        }
        return this.processLocal('addtrack', async () => {
            if (this.pc.addTrack) {
                this.pc.addTrack(track, stream);
            } else {
                (this.pc as any).addStream(stream);
            }
            if (cb) {
                cb();
            }
        });
    }

    public async removeTrack(sender: RTCRtpSender, cb?: ActionCallback) {
        return this.processLocal('removetrack', async () => {
            this.pc.removeTrack(sender);
            if (cb) {
                return cb();
            }
        });
    }

    // ----------------------------------------------------------------
    // Track event handlers
    // ----------------------------------------------------------------

    public onAddTrack(track: MediaStreamTrack, stream: MediaStream): void {
        this._log('info', 'Track added');
        this.parent.emit('peerTrackAdded', this, track, stream);
    }

    public onRemoveTrack(track: MediaStreamTrack): void {
        this._log('info', 'Track removed');
        this.parent.emit('peerTrackRemoved', this, track);
    }

    // ----------------------------------------------------------------
    // Jingle action handers
    // ----------------------------------------------------------------

    protected async onSessionInitiate(changes: Jingle, cb: ActionCallback) {
        this._log('info', 'Initiating incoming session');

        this.state = 'pending';
        this.role = 'responder';

        this.transportType = (changes.contents![0].transport! as JingleIce).transportType;

        const json = convertRequestToIntermediate(changes, this.peerRole);
        json.media.forEach(media => {
            if (media.kind === 'audio') {
                this.includesAudio = true;
            }
            if (media.kind === 'video') {
                this.includesVideo = true;
            }
            if (!media.streams) {
                media.streams = [{ stream: 'legacy', track: media.kind }];
            }
        });

        const sdp = exportToSDP(json);
        try {
            await this.pc.setRemoteDescription({ type: 'offer', sdp });
            await this.processBufferedCandidates();
            return cb();
        } catch (err) {
            this._log('error', 'Could not create WebRTC answer', err);
            return cb({ condition: 'general-error' });
        }
    }

    protected onSessionTerminate(changes: Jingle, cb: ActionCallback) {
        for (const receiver of this.pc.getReceivers()) {
            this.onRemoveTrack(receiver.track);
        }
        super.onSessionTerminate(changes, cb);
    }

    protected onSessionInfo(changes: Jingle, cb: ActionCallback) {
        const info: JingleInfo = changes.info || { infoType: '' };

        switch (info.infoType) {
            case JINGLE_INFO_RINGING:
                this._log('info', 'Outgoing session is ringing');
                this.ringing = true;
                this.parent.emit('ringing', this);
                return cb();
            case JINGLE_INFO_HOLD:
                this._log('info', 'On hold');
                this.parent.emit('hold', this);
                return cb();
            case JINGLE_INFO_UNHOLD:
            case JINGLE_INFO_ACTIVE:
                this._log('info', 'Resuming from hold');
                this.parent.emit('resumed', this);
                return cb();
            case JINGLE_INFO_MUTE:
                this._log('info', 'Muting', info);
                this.parent.emit('mute', this, info);
                return cb();
            case JINGLE_INFO_UNMUTE:
                this._log('info', 'Unmuting', info);
                this.parent.emit('unmute', this, info);
                return cb();
            default:
        }
        return cb();
    }
}
