import * as async from 'async';
import * as uuid from 'uuid';

const WildEmitter = require('wildemitter');

const ACTIONS = {
    'content-accept': 'onContentAccept',
    'content-add': 'onContentAdd',
    'content-modify': 'onContentModify',
    'content-reject': 'onContentReject',
    'content-remove': 'onContentRemove',
    'description-info': 'onDescriptionInfo',
    'security-info': 'onSecurityInfo',
    'session-accept': 'onSessionAccept',
    'session-info': 'onSessionInfo',
    'session-initiate': 'onSessionInitiate',
    'session-terminate': 'onSessionTerminate',
    'transport-accept': 'onTransportAccept',
    'transport-info': 'onTransportInfo',
    'transport-reject': 'onTransportReject',
    'transport-replace': 'onTransportReplace'
};

export default class JingleSession extends WildEmitter {
    constructor(opts) {
        super();

        this.sid = opts.sid || uuid.v4();
        this.peerID = opts.peerID;
        this.isInitiator = opts.initiator || false;
        this.parent = opts.parent;
        this.state = 'starting';
        this.connectionState = 'starting';
        // We track the intial pending description types in case
        // of the need for a tie-breaker.
        this.pendingApplicationTypes = opts.applicationTypes || [];
        this.pendingAction = false;
        // Here is where we'll ensure that all actions are processed
        // in order, even if a particular action requires async handling.
        this.processingQueue = async.queue((task, next) => {
            if (this.state === 'ended') {
                // Don't process anything once the session has been ended
                return next();
            }
            const action = task.action;
            const changes = task.changes;
            const cb = task.cb;
            this._log('debug', action);
            if (!ACTIONS[action] || !this[ACTIONS[action]]) {
                this._log('error', 'Invalid or unsupported action: ' + action);
                cb({ condition: 'bad-request' });
                return next();
            }
            this[ACTIONS[action]](changes, function(err, result) {
                cb(err, result);
                return next();
            });
        });
    }

    get state() {
        return this._sessionState;
    }
    set state(value) {
        if (value !== this._sessionState) {
            const prev = this._sessionState;
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
            const prev = this._connectionState;
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

    process(action, changes, cb) {
        this.processingQueue.push({
            action,
            cb,
            changes
        });
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
}
