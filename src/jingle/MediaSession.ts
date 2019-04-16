import {
    INFO_ACTIVE,
    INFO_HOLD,
    INFO_MUTE,
    INFO_RINGING,
    INFO_UNHOLD,
    INFO_UNMUTE,
    Jingle,
    JingleContent,
    JingleInfo,
    JingleReason,
    JingleRtpDescription
} from '../protocol/stanzas';
import ICESession from './ICESession';
import { exportToSDP, importFromSDP } from './lib/Intermediate';
import { Action, ReasonCondition, SessionRole } from './lib/JingleUtil';
import { convertIntermediateToRequest, convertRequestToIntermediate } from './lib/Protocol';
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
            this.emit('change:ringing', value);
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

    public async start(opts: RTCOfferOptions | ActionCallback, next?: ActionCallback) {
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
            await this.processLocal(Action.SessionInitiate, async () => {
                const offer = await this.pc.createOffer(opts as RTCOfferOptions);
                const json = importFromSDP(offer.sdp!);
                const jingle = convertIntermediateToRequest(json, this.role);
                jingle.sid = this.sid;
                jingle.action = Action.SessionInitiate;
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

    public async accept(opts: RTCAnswerOptions | ActionCallback, next?: ActionCallback) {
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
            await this.processLocal(Action.SessionAccept, async () => {
                const answer = await this.pc.createAnswer(opts as RTCAnswerOptions);

                const json = importFromSDP(answer.sdp!);
                const jingle = convertIntermediateToRequest(json, this.role);
                jingle.sid = this.sid;
                jingle.action = Action.SessionAccept;
                for (const content of jingle.contents || []) {
                    content.creator = 'initiator';
                }
                await this.pc.setLocalDescription(answer);

                this.send('session-accept', jingle);
            });

            next();
        } catch (err) {
            this._log('error', 'Could not create WebRTC answer', err);
            this.end('failed-application');
        }
    }

    public end(reason: ReasonCondition | JingleReason = 'success', silent: boolean = false) {
        for (const receiver of this.pc.getReceivers()) {
            this.onRemoveTrack(receiver.track);
        }
        super.end(reason, silent);
    }

    public ring(): Promise<void> {
        return this.processLocal('ring', async () => {
            this._log('info', 'Ringing on incoming session');
            this.ringing = true;
            this.send(Action.SessionInfo, {
                info: {
                    infoType: INFO_RINGING
                }
            });
        });
    }

    public mute(creator: SessionRole, name: string): Promise<void> {
        return this.processLocal('mute', async () => {
            this._log('info', 'Muting', name);

            this.send(Action.SessionInfo, {
                info: {
                    creator,
                    infoType: INFO_MUTE,
                    name
                }
            });
        });
    }

    public unmute(creator: SessionRole, name: string): Promise<void> {
        return this.processLocal('unmute', async () => {
            this._log('info', 'Unmuting', name);
            this.send(Action.SessionInfo, {
                info: {
                    creator,
                    infoType: INFO_UNMUTE,
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
                    infoType: INFO_HOLD
                }
            });
        });
    }

    public resume(): Promise<void> {
        return this.processLocal('resume', async () => {
            this._log('info', 'Resuming from hold');
            this.send('session-info', {
                info: {
                    infoType: INFO_ACTIVE
                }
            });
        });
    }

    // ----------------------------------------------------------------
    // Track control methods
    // ----------------------------------------------------------------

    public addTrack(track: MediaStreamTrack, stream: MediaStream, cb?: ActionCallback) {
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
        this.emit('peerTrackAdded', this, track, stream);
    }

    public onRemoveTrack(track: MediaStreamTrack): void {
        this._log('info', 'Track removed');
        this.emit('peerTrackRemoved', this, track);
    }

    // ----------------------------------------------------------------
    // Jingle action handers
    // ----------------------------------------------------------------

    protected async onSessionInitiate(changes: Jingle, cb: ActionCallback) {
        this._log('info', 'Initiating incoming session');

        this.state = 'pending';
        this.role = 'responder';

        const json = convertRequestToIntermediate(changes, this.peerRole);
        json.media.forEach(media => {
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
            case INFO_RINGING:
                this._log('info', 'Outgoing session is ringing');
                this.ringing = true;
                this.emit('ringing', this);
                return cb();
            case INFO_HOLD:
                this._log('info', 'On hold');
                this.emit('hold', this);
                return cb();
            case INFO_UNHOLD:
            case INFO_ACTIVE:
                this._log('info', 'Resuming from hold');
                this.emit('resumed', this);
                return cb();
            case INFO_MUTE:
                this._log('info', 'Muting', info);
                this.emit('mute', this, info);
                return cb();
            case INFO_UNMUTE:
                this._log('info', 'Unmuting', info);
                this.emit('unmute', this, info);
                return cb();
            default:
        }
        return cb();
    }
}
