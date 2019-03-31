import ICESession from './ICESession';
import { importFromSDP, exportToSDP } from './lib/Intermediate';
import { convertRequestToIntermediate, convertIntermediateToRequest } from './lib/Protocol';
import { INFO_MUTE, INFO_UNHOLD, INFO_HOLD, INFO_ACTIVE, INFO_RINGING } from '../protocol/stanzas';

function applyStreamsCompatibility(content) {
    /* signal .streams as a=ssrc: msid */
    if (
        content.application.streams &&
        content.application.streams.length &&
        content.application.sources &&
        content.application.sources.length
    ) {
        const msid = content.application.streams[0];
        content.application.sources[0].parameters.msid = `${msid.id} ${msid.track}`;
        if (content.application.sourceGroups && content.application.sourceGroups.length > 0) {
            content.application.sources.push({
                parameters: {
                    cname: content.application.sources[0].parameters.cname,
                    msid: `${msid.id} ${msid.track}`
                },
                ssrc: content.application.sourceGroups[0].sources[1]
            });
        }
    }
}

export default class MediaSession extends ICESession {
    constructor(opts) {
        super(opts);

        this.pc.addEventListener('track', e => {
            this.onAddTrack(e.track, e.streams[0]);
        });

        if (opts.stream) {
            for (const track of opts.stream.getTracks()) {
                this.addTrack(track, opts.stream);
            }
        }

        this._ringing = false;
    }

    // ----------------------------------------------------------------
    // Session control methods
    // ----------------------------------------------------------------

    async start(offerOptions, next) {
        this.state = 'pending';

        next = next || (() => undefined);

        this.role = 'initiator';
        this.offerOptions = offerOptions;

        try {
            await this.processLocal('session-initiate', async () => {
                const offer = await this.pc.createOffer(offerOptions);
                const json = importFromSDP(offer.sdp);
                const jingle = convertIntermediateToRequest(json, this.role);
                jingle.sid = this.sid;
                jingle.action = 'session-initate';
                jingle.contents.forEach(content => {
                    content.creator = 'initiator';
                    applyStreamsCompatibility(content);
                });
                await this.pc.setLocalDescription(offer);

                this.send('session-initiate', jingle);
            });

            next();
        } catch (err) {
            this._log('error', 'Could not create WebRTC offer', err);
            this.end('failed-application', true);
        }
    }

    async accept(opts, next) {
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
            await this.processLocal('session-accept', async () => {
                const answer = await this.pc.createAnswer(opts);

                const json = importFromSDP(answer.sdp);
                const jingle = convertIntermediateToRequest(json, this.role);
                jingle.sid = this.sid;
                jingle.action = 'session-accept';
                jingle.contents.forEach(content => {
                    content.creator = 'initiator';
                });
                await this.pc.setLocalDescription(answer);

                this.send('session-accept', jingle);
            });

            next();
        } catch (err) {
            this._log('error', 'Could not create WebRTC answer', err);
            this.end('failed-application');
        }
    }

    end(reason, silent) {
        this.pc.getReceivers().forEach(receiver => {
            this.onRemoveTrack(receiver.track);
        });
        super.end(reason, silent);
    }

    ring() {
        return this.processLocal('ring', () => {
            this._log('info', 'Ringing on incoming session');
            this.ringing = true;
            this.send('session-info', {
                info: {
                    infoType: INFO_RINGING
                }
            });
        });
    }

    mute(creator, name) {
        return this.processLocal('mute', () => {
            this._log('info', 'Muting', name);

            this.send('session-info', {
                info: {
                    creator,
                    infoType: INFO_MUTE,
                    name
                }
            });
        });
    }

    unmute(creator, name) {
        return this.processLocal('unmute', () => {
            this._log('info', 'Unmuting', name);
            this.send('session-info', {
                info: {
                    creator,
                    infoType: INFO_UNMUTE,
                    name
                }
            });
        });
    }

    hold() {
        return this.processLocal('hold', () => {
            this._log('info', 'Placing on hold');
            this.send('session-info', {
                info: {
                    infoType: INFO_HOLD
                }
            });
        });
    }

    resume() {
        return this.processLocal('resume', () => {
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

    addTrack(track, stream, cb) {
        return this.processLocal('addtrack', async () => {
            if (this.pc.addTrack) {
                this.pc.addTrack(track, stream);
            } else {
                this.pc.addStream(stream);
            }
            if (cb) {
                cb();
            }
        });
    }

    async removeTrack(sender, cb) {
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

    onAddTrack(track, stream) {
        this._log('info', 'Track added');
        this.emit('peerTrackAdded', this, track, stream);
    }

    onRemoveTrack(track) {
        this._log('info', 'Track removed');
        this.emit('peerTrackRemoved', this, track);
    }

    // ----------------------------------------------------------------
    // Jingle action handers
    // ----------------------------------------------------------------

    async onSessionInitiate(changes, cb) {
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

    onSessionTerminate(changes, cb) {
        for (const receiver of this.pc.getReceivers()) {
            this.onRemoveTrack(receiver.track);
        }
        super.onSessionTerminate(changes, cb);
    }

    onSessionInfo(changes, cb) {
        const info = changes.info;
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
                this._log('info', 'Muting', info.mute);
                this.emit('mute', this, info);
                return cb();
            case INFO_UNMUTE:
                this._log('info', 'Unmuting', info.unmute);
                this.emit('unmute', this, info);
                return cb();
            default:
        }
        return cb();
    }

    get ringing() {
        return this._ringing;
    }
    set ringing(value) {
        if (value !== this._ringing) {
            this._ringing = value;
            this.emit('change:ringing', value);
        }
    }

    get streams() {
        if (this.pc.signalingState !== 'closed') {
            return this.pc.getRemoteStreams();
        }
        return [];
    }
}
