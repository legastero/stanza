import { EventEmitter } from 'events';
import * as Hashes from 'iana-hashes';

import ICESession from './ICESession';
import { importFromSDP, exportToSDP } from './lib/Intermediate';
import { convertIntermediateToRequest, convertRequestToIntermediate } from './lib/Protocol';

export class Sender extends EventEmitter {
    constructor(opts = {}) {
        super();

        this.config = {
            chunkSize: 16384,
            hash: 'sha-1',
            pacing: 0,
            ...opts
        };

        this.file = null;
        this.channel = null;
        this.hash = Hashes.createHash(this.config.hash);
    }

    send(file, channel) {
        if (this.file && this.channel) {
            return;
        }

        this.file = file;
        this.channel = channel;
        this.channel.binaryType = 'arraybuffer';

        const usePoll = typeof channel.bufferedAmountLowThreshold !== 'number';

        const sliceFile = (offset = 0) => {
            const reader = new FileReader();
            reader.onload = () => {
                const data = new Uint8Array(reader.result);
                this.channel.send(data);
                this.hash.update(data);

                this.emit('progress', offset, file.size, data);

                if (file.size > offset + this.config.chunkSize) {
                    if (usePoll) {
                        setTimeout(sliceFile, this.config.pacing, offset + this.config.chunkSize);
                    } else if (channel.bufferedAmount <= channel.bufferedAmountLowThreshold) {
                        setTimeout(sliceFile, 0, offset + this.config.chunkSize);
                    } else {
                        // wait for bufferedAmountLow to fire
                    }
                } else {
                    this.emit('progress', file.size, file.size, null);
                    this.emit('sentFile', {
                        algo: this.config.hash,
                        hash: this.hash.digest('hex')
                    });
                }
            };

            const slice = file.slice(offset, offset + this.config.chunkSize);
            reader.readAsArrayBuffer(slice);
        };

        if (!usePoll) {
            channel.bufferedAmountLowThreshold = 8 * this.config.chunkSize;
            channel.addEventListener('bufferedamountlow', sliceFile);
        }
        setTimeout(sliceFile, 0, 0);
    }
}

export class Receiver extends EventEmitter {
    constructor(opts = {}) {
        super();

        this.config = {
            hash: 'sha-1',
            ...opts
        };

        this.receiveBuffer = [];
        this.received = 0;
        this.metadata = {};
        this.channel = null;
        this.hash = Hashes.createHash(this.config.hash);
    }

    receive(metadata, channel) {
        if (metadata) {
            this.metadata = metadata;
        }

        this.channel = channel;
        this.channel.binaryType = 'arraybuffer';

        this.channel.onmessage = e => {
            const len = e.data.byteLength;
            this.received += len;
            this.receiveBuffer.push(e.data);
            if (e.data) {
                this.hash.update(new Uint8Array(e.data));
            }

            this.emit('progress', this.received, this.metadata.size, e.data);
            if (this.received === this.metadata.size) {
                this.metadata.actualhash = this.hash.digest('hex');

                this.emit('receivedFile', new Blob(this.receiveBuffer), this.metadata);
                this.receiveBuffer = [];
            } else if (this.received > this.metadata.size) {
                // FIXME
                console.error('received more than expected, discarding...');
                this.receiveBuffer = []; // just discard...
            }
        };
    }
}

export default class FileTransferSession extends ICESession {
    constructor(opts) {
        super(opts);

        this.sender = null;
        this.receiver = null;
        this.file = null;
    }

    start(file, next) {
        next = next || (() => undefined);

        this.state = 'pending';
        this.role = 'initiator';

        this.file = file;

        this.sender = new Sender();
        this.sender.on('progress', (sent, size) => {
            this._log('info', 'Send progress ' + sent + '/' + size);
        });
        this.sender.on('sentFile', meta => {
            this._log('info', 'Sent file', meta.name);

            this.send('description-info', {
                contents: [
                    {
                        application: {
                            applicationType: 'filetransfer',
                            offer: {
                                hash: {
                                    algo: meta.algo,
                                    value: meta.hash
                                }
                            }
                        },
                        creator: 'initiator',
                        name: this.contentName
                    }
                ]
            });

            this.emit('sentFile', this, meta);
        });

        this.channel = this.pc.createDataChannel('filetransfer', {
            ordered: true
        });
        this.channel.onopen = () => {
            this.sender.send(this.file, this.channel);
        };

        this.pc
            .createOffer({
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            })
            .then(offer => {
                const json = importFromSDP(offer.sdp);
                const jingle = convertIntermediateToRequest(json, this.role);

                this.contentName = jingle.contents[0].name;

                jingle.sessionId = this.sid;
                jingle.action = 'session-initate';
                jingle.contents[0].application = {
                    applicationType: 'filetransfer',
                    offer: {
                        date: file.lastModifiedDate,
                        hash: {
                            algo: 'sha-1',
                            value: ''
                        },
                        name: file.name,
                        size: file.size
                    }
                };

                this.send('session-initiate', jingle);

                return this.pc.setLocalDescription(offer).then(() => next());
            })
            .catch(err => {
                console.error(err);
                this._log('error', 'Could not create WebRTC offer', err);
                return this.end('failed-application', true);
            });
    }

    accept(next) {
        this._log('info', 'Accepted incoming session');

        this.role = 'responder';
        this.state = 'active';

        next = next || (() => undefined);

        this.pc
            .createAnswer()
            .then(answer => {
                const json = importFromSDP(answer.sdp);
                const jingle = convertIntermediateToRequest(json, this.role);
                jingle.sessionId = this.sid;
                jingle.action = 'session-accept';
                jingle.contents.forEach(content => {
                    content.creator = 'initiator';
                });
                this.contentName = jingle.contents[0].name;
                this.send('session-accept', jingle);
                return this.pc.setLocalDescription(answer).then(() => next());
            })
            .catch(err => {
                console.error(err);
                this._log('error', 'Could not create WebRTC answer', err);
                this.end('failed-application');
            });
    }

    onSessionInitiate(changes, cb) {
        this._log('info', 'Initiating incoming session');

        this.role = 'responder';
        this.state = 'pending';

        const json = convertRequestToIntermediate(changes, this.role);
        const sdp = exportToSDP(json);
        const desc = changes.contents[0].application;

        this.receiver = new Receiver({ hash: desc.offer.hash.algo });
        this.receiver.on('progress', (received, size) => {
            this._log('info', 'Receive progress ' + received + '/' + size);
        });
        this.receiver.on('receivedFile', file => {
            this.receivedFile = file;
            this._maybeReceivedFile();
        });
        this.receiver.metadata = desc.offer;
        this.pc.addEventListener('datachannel', e => {
            this.channel = e.channel;
            this.receiver.receive(null, e.channel);
        });

        this.pc
            .setRemoteDescription({ type: 'offer', sdp })
            .then(() => {
                if (cb) {
                    return cb();
                }
            })
            .catch(err => {
                console.error(err);
                this._log('error', 'Could not create WebRTC answer', err);
                if (cb) {
                    return cb({ condition: 'general-error' });
                }
            });
    }

    onDescriptionInfo(info, cb) {
        const hash = info.contents[0].application.offer.hash;
        this.receiver.metadata.hash = hash;
        if (this.receiver.metadata.actualhash) {
            this._maybeReceivedFile();
        }
        cb();
    }

    _maybeReceivedFile() {
        if (!this.receiver.metadata.hash.value) {
            // unknown hash, file transfer not completed
        } else if (this.receiver.metadata.hash.value === this.receiver.metadata.actualhash) {
            this._log('info', 'File hash matches');
            this.emit('receivedFile', this, this.receivedFile, this.receiver.metadata);
            this.end('success');
        } else {
            this._log('error', 'File hash does not match');
            this.end('media-error');
        }
    }
}
