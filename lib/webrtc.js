var uuid = require('node-uuid');

// normalize environment
var RTCPeerConnection = null,
    getUserMedia = null,
    attachMediaStream = null,
    reattachMediaStream = null,
    browser = null,
    webRTCSupport = true;


if (navigator.mozGetUserMedia) {
    browser = "firefox";

    // The RTCPeerConnection object.
    RTCPeerConnection = mozRTCPeerConnection;

    // The RTCSessionDescription object.
    RTCSessionDescription = mozRTCSessionDescription;

    // The RTCIceCandidate object.
    RTCIceCandidate = mozRTCIceCandidate;

    // Get UserMedia (only difference is the prefix).
    // Code from Adam Barth.
    getUserMedia = navigator.mozGetUserMedia.bind(navigator);

    // Attach a media stream to an element.
    attachMediaStream = function(element, stream) {
        element.mozSrcObject = stream;
        element.play();
    };

    reattachMediaStream = function(to, from) {
        to.mozSrcObject = from.mozSrcObject;
        to.play();
    };

    // Fake get{Video,Audio}Tracks
    MediaStream.prototype.getVideoTracks = function() {
        return [];
    };

    MediaStream.prototype.getAudioTracks = function() {
        return [];
    };
} else if (navigator.webkitGetUserMedia) {
    browser = "chrome";

    // The RTCPeerConnection object.
    RTCPeerConnection = webkitRTCPeerConnection;

    // Get UserMedia (only difference is the prefix).
    // Code from Adam Barth.
    getUserMedia = navigator.webkitGetUserMedia.bind(navigator);

    // Attach a media stream to an element.
    attachMediaStream = function(element, stream) {
        element.autoplay = true;
        element.src = webkitURL.createObjectURL(stream);
    };

    reattachMediaStream = function(to, from) {
        to.src = from.src;
    };

    // The representation of tracks in a stream is changed in M26.
    // Unify them for earlier Chrome versions in the coexisting period.
    if (!webkitMediaStream.prototype.getVideoTracks) {
        webkitMediaStream.prototype.getVideoTracks = function() {
            return this.videoTracks;
        };
        webkitMediaStream.prototype.getAudioTracks = function() {
            return this.audioTracks;
        };
    }

    // New syntax of getXXXStreams method in M26.
    if (!webkitRTCPeerConnection.prototype.getLocalStreams) {
        webkitRTCPeerConnection.prototype.getLocalStreams = function() {
            return this.localStreams;
        };
        webkitRTCPeerConnection.prototype.getRemoteStreams = function() {
            return this.remoteStreams;
        };
    }
} else {
    webRTCSupport = false;
}

 
function WebRTC(client) {
    var self = this;

    this.client = client;
    this.peerConnectionConfig = {
        iceServers: browser == 'firefox' ? [{url: 'stun:124.124.124.2'}] : [{url: 'stun:stun.l.google.com:19302'}]
    };
    this.peerConnectionConstraints = {
        optional: [{DtlsSrtpKeyAgreement: true}]
    };
    this.media = {
        audio: true,
        video: {
            mandatory: {},
            optional: []
        }
    };
    this.sessions = {};
    this.peerSessions = {};

    this.attachMediaStream = attachMediaStream;

    // check for support
    if (!webRTCSupport) {
        client.emit('webrtc:unsupported');
        return self;
    } else {
        client.emit('webrtc:supported');

        client.disco.addFeature('', 'http://stanza.io/protocol/sox');

        client.on('message', function (msg) {
            if (msg.type !== 'error' && msg._extensions['sox']) {
                var fullId = msg.from + ':' + msg.sox.sid,
                    session;
                if (msg.sox.type === 'offer') {
                    console.log('got an offer');
                    session = new Peer(client, msg.from, msg.sox.sid);
                    self.sessions[fullId] = session;
                    if (!self.peerSessions[msg.from]) {
                        self.peerSessions[msg.from] = [];
                    }
                    self.peerSessions[msg.from].push(fullId);
                } else if (msg.sox.type === 'answer') {
                    console.log('got an answer');
                    session = self.sessions[fullId];
                    if (session) {
                        console.log('Setting remote description');
                        session.conn.setRemoteDescription(new RTCSessionDescription({
                            type: 'answer',
                            sdp: msg.sox.sdp
                        }));
                    }
                } else if (msg.sox.type === 'candidate') {
                    session = self.sessions[fullId];
                    if (session) {
                        console.log('Adding new ICE candidate');
                        session.conn.addIceCandidate(new RTCIceCandidate({
                            sdpMLineIndex: msg.sox.label,
                            candidate: msg.sox.sdp
                        }));
                    }
                }
                client.emit('webrtc:' + msg.sox.type, msg);
            }
        });
    }
}

WebRTC.prototype = {
    constructor: {
        value: WebRTC
    },
    testReadiness: function () {
        var self = this;
        if (this.localStream && this.client.sessionStarted) {
            // This timeout is a workaround for the strange no-audio bug
            // as described here: https://code.google.com/p/webrtc/issues/detail?id=1525
            // remove timeout when this is fixed.
            setTimeout(function () {
                self.client.emit('webrtc:ready');
            }, 1000);
        }
    },
    startLocalMedia: function (element) {
        var self = this;
        getUserMedia(this.media, function (stream) {
            attachMediaStream(element, stream);
            self.localStream = stream;
            self.testReadiness();
        }, function () {
            throw new Error('Failed to get access to local media.');
        });
    },
    offerSession: function (peer) {
        var self = this,
            sid = uuid.v4(),
            session = new Peer(this.client, peer, sid);

        this.sessions[peer + ':' + sid] = session;
        if (!this.peerSessions[peer]) {
            this.peerSessions[peer] = [];
        }
        this.peerSessions[peer].push(peer + ':' + sid);

        session.conn.createOffer(function (sdp) {
            console.log('Setting local description');
            session.conn.setLocalDescription(sdp);
            console.log('Sending offer');
            self.client.sendMessage({
                to: peer,
                sox: {
                    type: 'offer',
                    sid: sid,
                    sdp: sdp.sdp
                }
            });
        }, null, this.mediaConstraints);
    },
    acceptSession: function (offerMsg) {
        var self = this;
        var session = self.sessions[offerMsg.from + ':' + offerMsg.sox.sid];

        if (session) {
            console.log('Setting remote description');
            session.conn.setRemoteDescription(new RTCSessionDescription({
                type: 'offer',
                sdp: offerMsg.sox.sdp
            }));
            session.conn.createAnswer(function (sdp) {
                console.log('Setting local description');
                session.conn.setLocalDescription(sdp);
                console.log('Sending answer');
                self.client.sendMessage({
                    to: session.jid,
                    sox: {
                        type: 'answer',
                        sid: session.sid,
                        sdp: sdp.sdp
                    }
                });
            }, null, this.mediaConstraints);
        }
    },
    declineSession: function (offerMsg) {
        this.endSession(offerMsg.from, offerMsg.sox.sid);
    },
    endSession: function (peer, sid) {
        var session = this.sessions[peer + ':' + sid];
        if (session) {
            var fullId = peer + ':' + sid,
                index = this.peerSessions[peer].indexOf(fullId);
            if (index != -1) {
                this.peerSessions.splice(index, 1);
            }
            this.sessions[fullId] = undefined;

            session.conn.close();
            this.client.emit('webrtc:stream:removed', {
                sid: session.sid,
                peer: session.jid
            });

            this.client.sendMessage({
                to: peer,
                sox: {
                    type: 'end',
                    sid: sid
                }
            });
        }
    },
    // Audio controls
    mute: function () {
        this._audioEnabled(false);
        this.client.emit('webrtc:audio:off');
    },
    unmute: function () {
        this._audioEnabled(true);
        this.client.emit('webrtc:audio:on');
    },
    // Video controls
    pauseVideo: function () {
        this._videoEnabled(false);
        this.client.emit('webrtc:video:off');
    },
    resumeVideo: function () {
        this._videoEnabled(true);
        this.client.emit('webrtc:video:on');
    },
    // Combined controls
    pause: function () {
        this.mute();
        this.pauseVideo();
    },
    resume: function () {
        this.unmute();
        this.resumeVideo();
    },
    // Internal methods for enabling/disabling audio/video
    _audioEnabled: function (bool) {
        this.localStream.getAudioTracks().forEach(function (track) {
            track.enabled = !!bool;
        });
    },
    _videoEnabled: function (bool) {
        this.localStream.getVideoTracks().forEach(function (track) {
            track.enabled = !!bool;
        });
    }
};


function Peer(client, jid, sid) {
    var self = this;

    this.client = client;
    this.jid = jid;
    this.sid = sid;
    this.closed = false;

    this.conn = new RTCPeerConnection(client.webrtc.peerConnectionConfig, client.webrtc.peerConnectionConstraints);
    this.conn.addStream(client.webrtc.localStream);
    this.conn.onicecandidate = function (event) {
        if (self.closed) return;
        if (event.candidate) {
            console.log('Sending candidate');
            self.client.sendMessage({
                mto: self.jid,
                sox: {
                    type: 'candidate',
                    sid: self.sid,
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    sdp: event.candidate.candidate
                }
            });
        } else {
            console.log('End of ICE candidates');
        }
    };
    this.conn.onaddstream = function (event) {
        self.client.emit('webrtc:stream:added', {
            stream: event.stream,
            sid: self.sid,
            peer: self.jid
        });
    };
    this.conn.onremovestream = function (event) {
        self.client.emit('webrtc:stream:removed', {
            sid: self.sid,
            peer: self.jid
        });
    };

    this.mediaConstraints = {
        mandatory: {
            OfferToReceiveAudio: true,
            OfferToReceiveVideo: true
        }
    };
}

Peer.prototype = {
    constructor: {
        value: Peer
    }
};


exports.init = function (client) {
    client.webrtc = new WebRTC(client);
};
