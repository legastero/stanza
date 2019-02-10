import ICESession from './ICESession';
import { importFromSDP, exportToSDP } from './lib/Intermediate';
import { convertRequestToIntermediate, convertIntermediateToRequest } from './lib/Protocol';

function applyStreamsCompatibility(content) {
    /* signal .streams as a=ssrc: msid */
    if (
        content.application.streams &&
        content.application.streams.length &&
        content.application.sources &&
        content.application.sources.length
    ) {
        const msid = content.application.streams[0];
        content.application.sources[0].parameters.push({
            key: 'msid',
            value: `${msid.id} ${msid.track}`
        });
        if (content.application.sourceGroups && content.application.sourceGroups.length > 0) {
            content.application.sources.push({
                parameters: [
                    {
                        key: 'cname',
                        value: content.application.sources[0].parameters[0].value
                    },
                    { key: 'msid', value: `${msid.id} ${msid.track}` }
                ],
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

    start(offerOptions, next) {
        this.state = 'pending';

        next = next || (() => undefined);

        this.role = 'initiator';
        this.offerOptions = offerOptions;
        this.pc
            .createOffer(offerOptions)
            .then(offer => {
                const json = importFromSDP(offer.sdp);
                const jingle = convertIntermediateToRequest(json, this.role);
                jingle.sessionId = this.sid;
                jingle.action = 'session-initate';
                jingle.contents.forEach(content => {
                    content.creator = 'initiator';
                    applyStreamsCompatibility(content);
                });

                this.send('session-initiate', jingle);

                return this.pc.setLocalDescription(offer).then(() => next());
            })
            .catch(err => {
                this._log('error', 'Could not create WebRTC offer', err);
                this.end('failed-application', true);
            });
    }

    accept(opts, next) {
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

        this.pc
            .createAnswer(opts)
            .then(answer => {
                const json = importFromSDP(answer.sdp);
                const jingle = convertIntermediateToRequest(json, this.role);
                jingle.sessionId = this.sid;
                jingle.action = 'session-accept';
                jingle.contents.forEach(content => {
                    content.creator = 'initiator';
                });
                this.send('session-accept', jingle);
                return this.pc.setLocalDescription(answer).then(() => next());
            })
            .catch(err => {
                this._log('error', 'Could not create WebRTC answer', err);
                this.end('failed-application');
            });
    }

    end(reason, silent) {
        this.pc.getReceivers().forEach(receiver => {
            this.onRemoveTrack(receiver.track);
        });
        super.end(reason, silent);
    }

    ring() {
        this._log('info', 'Ringing on incoming session');
        this.ringing = true;
        this.send('session-info', { ringing: true });
    }

    mute(creator, name) {
        this._log('info', 'Muting', name);

        this.send('session-info', {
            mute: {
                creator,
                name
            }
        });
    }

    unmute(creator, name) {
        this._log('info', 'Unmuting', name);
        this.send('session-info', {
            unmute: {
                creator,
                name
            }
        });
    }

    hold() {
        this._log('info', 'Placing on hold');
        this.send('session-info', { hold: true });
    }

    resume() {
        this._log('info', 'Resuming from hold');
        this.send('session-info', { active: true });
    }

    // ----------------------------------------------------------------
    // Track control methods
    // ----------------------------------------------------------------

    addTrack(track, stream, cb) {
        if (this.pc.addTrack) {
            this.pc.addTrack(track, stream);
        } else {
            this.pc.addStream(stream, cb);
        }
        if (cb) {
            return cb();
        }
    }

    removeTrack(sender, cb) {
        this.pc.removeTrack(sender);
        if (cb) {
            return cb();
        }
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

    onSessionInitiate(changes, cb) {
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
        this.pc
            .setRemoteDescription({ type: 'offer', sdp })
            .then(() => {
                if (cb) {
                    return cb();
                }
            })
            .catch(err => {
                this._log('error', 'Could not create WebRTC answer', err);
                if (cb) {
                    return cb({ condition: 'general-error' });
                }
            });
    }

    onSessionTerminate(changes, cb) {
        for (const receiver of this.pc.getReceivers()) {
            this.onRemoveTrack(receiver.track);
        }
        super.onSessionTerminate(changes, cb);
    }

    onSessionInfo(info, cb) {
        if (info.ringing) {
            this._log('info', 'Outgoing session is ringing');
            this.ringing = true;
            this.emit('ringing', this);
            return cb();
        }

        if (info.hold) {
            this._log('info', 'On hold');
            this.emit('hold', this);
            return cb();
        }

        if (info.active) {
            this._log('info', 'Resuming from hold');
            this.emit('resumed', this);
            return cb();
        }

        if (info.mute) {
            this._log('info', 'Muting', info.mute);
            this.emit('mute', this, info.mute);
            return cb();
        }

        if (info.unmute) {
            this._log('info', 'Unmuting', info.unmute);
            this.emit('unmute', this, info.unmute);
            return cb();
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
