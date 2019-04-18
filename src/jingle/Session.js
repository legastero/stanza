import * as async from '../lib/async';
import * as uuid from 'uuid';

const WildEmitter = require('wildemitter');

export default class JingleSession extends WildEmitter {
    constructor(opts) {
        super();

        this.sid = opts.sid || uuid.v4();
        this.peerID = opts.peerID;
        this.role = opts.initiator ? 'initiator' : 'responder';
        this.parent = opts.parent;
        this.state = 'starting';
        this.connectionState = 'starting';
        // We track the intial pending description types in case
        // of the need for a tie-breaker.
        this.pendingApplicationTypes = opts.applicationTypes || [];
        this.pendingAction = false;
        // Here is where we'll ensure that all actions are processed
        // in order, even if a particular action requires async handling.
        this.processingQueue = async.priorityQueue(async (task, next) => {
            if (this.state === 'ended') {
                // Don't process anything once the session has been ended
                if (task.reject) {
                    task.reject(new Error('Session ended'));
                }
                return next();
            }

            if (task.type === 'local') {
                this._log('debug', 'Processing local action:', task.name);
                try {
                    const res = await task.handler();
                    task.resolve(res);
                } catch (err) {
                    task.reject(err);
                }
                if (next) {
                    return next();
                }
                return;
            }

            const { action, changes, cb } = task;
            this._log('debug', 'Processing remote action:', action);

            return new Promise(resolve => {
                const done = (err, result) => {
                    cb(err, result);
                    if (next) {
                        next();
                    }
                    resolve();
                };

                switch (action) {
                    case 'content-accept':
                        return this.onContentAccept(changes, done);
                    case 'content-add':
                        return this.onContentAdd(changes, done);
                    case 'content-modify':
                        return this.onContentModify(changes, done);
                    case 'content-reject':
                        return this.onContentReject(changes, done);
                    case 'content-remove':
                        return this.onContentRemove(changes, done);
                    case 'description-info':
                        return this.onDescriptionInfo(changes, done);
                    case 'security-info':
                        return this.onSecurityInfo(changes, done);
                    case 'session-accept':
                        return this.onSessionAccept(changes, done);
                    case 'session-info':
                        return this.onSessionInfo(changes, done);
                    case 'session-initiate':
                        return this.onSessionInitiate(changes, done);
                    case 'session-terminate':
                        return this.onSessionTerminate(changes, done);
                    case 'transport-accept':
                        return this.onTransportAccept(changes, done);
                    case 'transport-info':
                        return this.onTransportInfo(changes, done);
                    case 'transport-reject':
                        return this.onTransportReject(changes, done);
                    case 'transport-replace':
                        return this.onTransportReplace(changes, done);
                    default:
                        this._log('error', 'Invalid or unsupported action: ' + action);
                        done({ condition: 'bad-request' });
                }
            });
        });
    }

    get isInitiator() {
        return this.role === 'initiator';
    }

    get peerRole() {
        return this.isInitiator ? 'responder' : 'initiator';
    }

    get state() {
        return this._sessionState;
    }
    set state(value) {
        if (value !== this._sessionState) {
            this._log('info', 'Changing session state to: ' + value);
            this._sessionState = value;
            this.emit('sessionState', this, value);
        }
    }

    get connectionState() {
        return this._connectionState;
    }
    set connectionState(value) {
        if (value !== this._connectionState) {
            this._log('info', 'Changing connection state to: ' + value);
            this._connectionState = value;
            this.emit('connectionState', this, value);
        }
    }

    _log(level, message, ...data) {
        message = this.sid + ': ' + message;
        this.emit('log:' + level, message, ...data);
    }

    send(action, data) {
        data = data || {};
        data.sid = this.sid;
        data.action = action;

        const requirePending = {
            'content-accept': true,
            'content-add': true,
            'content-modify': true,
            'content-reject': true,
            'content-remove': true,
            'session-accept': true,
            'session-inititate': true,
            'transport-accept': true,
            'transport-reject': true,
            'transport-replace': true
        };

        if (requirePending[action]) {
            this.pendingAction = action;
        } else {
            this.pendingAction = false;
        }

        this.emit('send', {
            id: uuid.v4(),
            jingle: data,
            to: this.peerID,
            type: 'set'
        });
    }

    processLocal(name, handler) {
        return new Promise((resolve, reject) => {
            this.processingQueue.push(
                {
                    handler,
                    name,
                    reject,
                    resolve,
                    type: 'local'
                },
                1 // Process local requests first
            );
        });
    }

    process(action, changes, cb) {
        this.processingQueue.push(
            {
                action,
                cb,
                changes,
                type: 'remote'
            },
            2 // Process remote requests second
        );
    }

    start(opts, next) {
        this._log('error', 'Can not start base sessions');
        this.end('unsupported-applications', true);
    }

    accept(opts, next) {
        this._log('error', 'Can not accept base sessions');
        this.end('unsupported-applications');
    }

    cancel() {
        this.end('cancel');
    }

    decline() {
        this.end('decline');
    }

    end(reason, silent) {
        this.state = 'ended';

        this.processingQueue.kill();

        if (!reason) {
            reason = 'success';
        }

        if (typeof reason === 'string') {
            reason = {
                condition: reason
            };
        }

        if (!silent) {
            this.send('session-terminate', {
                reason
            });
        }

        this.emit('terminated', this, reason);
    }

    onSessionInitiate(changes, cb) {
        cb();
    }

    onSessionAccept(changes, cb) {
        cb();
    }

    onSessionTerminate(changes, cb) {
        this.end(changes.reason, true);
        cb();
    }

    // It is mandatory to reply to a session-info action with
    // an unsupported-info error if the info isn't recognized.
    //
    // However, a session-info action with no associated payload
    // is acceptable (works like a ping).
    onSessionInfo(changes, cb) {
        const okKeys = {
            action: true,
            initiator: true,
            responder: true,
            sid: true
        };

        let unknownPayload = false;
        Object.keys(changes).forEach(function(key) {
            if (!okKeys[key]) {
                unknownPayload = true;
            }
        });

        if (unknownPayload) {
            cb({
                condition: 'feature-not-implemented',
                jingleCondition: 'unsupported-info',
                type: 'modify'
            });
        } else {
            cb();
        }
    }

    // It is mandatory to reply to a security-info action with
    // an unsupported-info error if the info isn't recognized.
    onSecurityInfo(changes, cb) {
        cb({
            condition: 'feature-not-implemented',
            jingleCondition: 'unsupported-info',
            type: 'modify'
        });
    }

    // It is mandatory to reply to a description-info action with
    // an unsupported-info error if the info isn't recognized.
    onDescriptionInfo(changes, cb) {
        cb({
            condition: 'feature-not-implemented',
            jingleCondition: 'unsupported-info',
            type: 'modify'
        });
    }

    // It is mandatory to reply to a transport-info action with
    // an unsupported-info error if the info isn't recognized.
    onTransportInfo(changes, cb) {
        cb({
            condition: 'feature-not-implemented',
            jingleCondition: 'unsupported-info',
            type: 'modify'
        });
    }

    // It is mandatory to reply to a content-add action with either
    // a content-accept or content-reject.
    onContentAdd(changes, cb) {
        // Allow ack for the content-add to be sent.
        cb();

        this.send('content-reject', {
            reason: {
                condition: 'failed-application',
                text: 'content-add is not supported'
            }
        });
    }

    onContentAccept(changes, cb) {
        cb({ condition: 'bad-request' });
    }

    onContentReject(changes, cb) {
        cb({ condition: 'bad-request' });
    }

    onContentModify(changes, cb) {
        cb({ condition: 'bad-request' });
    }

    onContentRemove(changes, cb) {
        cb({ condition: 'bad-request' });
    }

    // It is mandatory to reply to a transport-add action with either
    // a transport-accept or transport-reject.
    onTransportReplace(changes, cb) {
        // Allow ack for the transport-replace be sent.
        cb();

        this.send('transport-reject', {
            reason: {
                condition: 'failed-application',
                text: 'transport-replace is not supported'
            }
        });
    }

    onTransportAccept(changes, cb) {
        cb({ condition: 'bad-request' });
    }

    onTransportReject(changes, cb) {
        cb({ condition: 'bad-request' });
    }
}
