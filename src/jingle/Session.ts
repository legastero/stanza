import { priorityQueue } from 'async';

import { Jingle, JingleReason } from '../protocol';
import { uuid } from '../Utils';

import { Action, ReasonCondition, SessionRole } from './lib/JingleUtil';
import SessionManager from './SessionManager';

export type ActionCallback = (err?: any, res?: any) => void;

export interface LocalProcessingTask {
    type: 'local';
    name: string;
    handler: () => Promise<any>;
    reject: (err?: any) => void;
    resolve: (res?: any) => void;
}

export interface RemoteProcessingTask {
    type: 'remote';
    action: Action;
    changes: Jingle;
    cb: ActionCallback;
}

export interface SessionOpts {
    sid?: string;
    peerID: string;
    initiator?: boolean;
    parent: SessionManager;
    applicationTypes?: string[];
}

export default class JingleSession {
    public parent: SessionManager;
    public sid: string;
    public peerID: string;
    public role: SessionRole;
    public pendingApplicationTypes?: string[];
    public pendingAction?: Action;

    public processingQueue: async.AsyncPriorityQueue<any>;

    private _sessionState: string;
    private _connectionState: string;

    constructor(opts: SessionOpts) {
        this.parent = opts.parent;
        this.sid = opts.sid || uuid();
        this.peerID = opts.peerID;
        this.role = opts.initiator ? 'initiator' : 'responder';

        this._sessionState = 'starting';
        this._connectionState = 'starting';

        // We track the intial pending description types in case
        // of the need for a tie-breaker.
        this.pendingApplicationTypes = opts.applicationTypes || [];
        this.pendingAction = undefined;

        // Here is where we'll ensure that all actions are processed
        // in order, even if a particular action requires async handling.
        this.processingQueue = priorityQueue<LocalProcessingTask | RemoteProcessingTask>(
            async (task, next) => {
                if (this.state === 'ended') {
                    // Don't process anything once the session has been ended
                    if (task.type === 'local' && task.reject) {
                        task.reject(new Error('Session ended'));
                    }
                    if (next) {
                        next();
                    }
                    return;
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
                        next();
                    }
                    return;
                }

                const { action, changes, cb } = task;
                this._log('debug', 'Processing remote action:', action);

                return new Promise(resolve => {
                    const done = (err: any, result?: any) => {
                        cb(err, result);
                        if (next) {
                            next();
                        }
                        resolve();
                    };

                    switch (action) {
                        case Action.ContentAccept:
                            return this.onContentAccept(changes, done);
                        case Action.ContentAdd:
                            return this.onContentAdd(changes, done);
                        case Action.ContentModify:
                            return this.onContentModify(changes, done);
                        case Action.ContentReject:
                            return this.onContentReject(changes, done);
                        case Action.ContentRemove:
                            return this.onContentRemove(changes, done);
                        case Action.DescriptionInfo:
                            return this.onDescriptionInfo(changes, done);
                        case Action.SecurityInfo:
                            return this.onSecurityInfo(changes, done);
                        case Action.SessionAccept:
                            return this.onSessionAccept(changes, done);
                        case Action.SessionInfo:
                            return this.onSessionInfo(changes, done);
                        case Action.SessionInitiate:
                            return this.onSessionInitiate(changes, done);
                        case Action.SessionTerminate:
                            return this.onSessionTerminate(changes, done);
                        case Action.TransportAccept:
                            return this.onTransportAccept(changes, done);
                        case Action.TransportInfo:
                            return this.onTransportInfo(changes, done);
                        case Action.TransportReject:
                            return this.onTransportReject(changes, done);
                        case Action.TransportReplace:
                            return this.onTransportReplace(changes, done);
                        default:
                            this._log('error', 'Invalid or unsupported action: ' + action);
                            done({ condition: 'bad-request' });
                    }
                });
            },
            1
        );
    }

    public get isInitiator(): boolean {
        return this.role === SessionRole.Initiator;
    }

    public get peerRole(): SessionRole {
        return this.isInitiator ? SessionRole.Responder : SessionRole.Initiator;
    }

    public get state(): string {
        return this._sessionState;
    }
    public set state(value) {
        if (value !== this._sessionState) {
            this._log('info', 'Changing session state to: ' + value);
            this._sessionState = value;
            if (this.parent) {
                this.parent.emit('sessionState', this, value);
            }
        }
    }

    public get connectionState(): string {
        return this._connectionState;
    }
    public set connectionState(value) {
        if (value !== this._connectionState) {
            this._log('info', 'Changing connection state to: ' + value);
            this._connectionState = value;
            if (this.parent) {
                this.parent.emit('connectionState', this, value);
            }
        }
    }

    public send(action: Action, data: Partial<Jingle>) {
        data = data || {};
        data.sid = this.sid;
        data.action = action;

        const requirePending: Set<Action> = new Set([
            Action.ContentAccept,
            Action.ContentAdd,
            Action.ContentModify,
            Action.ContentReject,
            Action.ContentRemove,
            Action.SessionAccept,
            Action.SessionInitiate,
            Action.TransportAccept,
            Action.TransportReject,
            Action.TransportReplace
        ]);

        if (requirePending.has(action)) {
            this.pendingAction = action;
        } else {
            this.pendingAction = undefined;
        }

        this.parent.signal(this, {
            id: uuid(),
            jingle: data as Jingle,
            to: this.peerID,
            type: 'set'
        });
    }

    public processLocal(name: string, handler: () => Promise<void>): Promise<void> {
        return new Promise<void>((resolve, reject) => {
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

    public process(action: Action, changes: Jingle, cb: ActionCallback) {
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

    public start(next: ActionCallback): void;
    public start(opts: any, next?: ActionCallback): void {
        this._log('error', 'Can not start base sessions');
        this.end('unsupported-applications', true);
    }

    public accept(next?: ActionCallback): void;
    public accept(opts?: any, next?: ActionCallback): void {
        this._log('error', 'Can not accept base sessions');
        this.end('unsupported-applications');
    }

    public cancel() {
        this.end('cancel');
    }

    public decline() {
        this.end('decline');
    }

    public end(reason: ReasonCondition | JingleReason = 'success', silent: boolean = false) {
        this.state = 'ended';

        this.processingQueue.kill();

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

        this.parent.emit('terminated', this, reason);
        this.parent.forgetSession(this);
    }

    protected _log(level: string, message: string, ...data: any[]) {
        if (this.parent) {
            message = this.sid + ': ' + message;
            this.parent.emit('log:' + level, message, ...data);
        }
    }

    protected onSessionInitiate(changes: Jingle, cb: ActionCallback) {
        cb();
    }

    protected onSessionAccept(changes: Jingle, cb: ActionCallback) {
        cb();
    }

    protected onSessionTerminate(changes: Jingle, cb: ActionCallback) {
        this.end(changes.reason, true);
        cb();
    }

    // It is mandatory to reply to a session-info action with
    // an unsupported-info error if the info isn't recognized.
    //
    // However, a session-info action with no associated payload
    // is acceptable (works like a ping).
    protected onSessionInfo(changes: Jingle, cb: ActionCallback) {
        if (!changes.info) {
            cb();
        } else {
            cb({
                condition: 'feature-not-implemented',
                jingleError: 'unsupported-info',
                type: 'modify'
            });
        }
    }

    // It is mandatory to reply to a security-info action with
    // an unsupported-info error if the info isn't recognized.
    protected onSecurityInfo(changes: Jingle, cb: ActionCallback) {
        cb({
            condition: 'feature-not-implemented',
            jingleError: 'unsupported-info',
            type: 'modify'
        });
    }

    // It is mandatory to reply to a description-info action with
    // an unsupported-info error if the info isn't recognized.
    protected onDescriptionInfo(changes: Jingle, cb: ActionCallback) {
        cb({
            condition: 'feature-not-implemented',
            jingleError: 'unsupported-info',
            type: 'modify'
        });
    }

    // It is mandatory to reply to a transport-info action with
    // an unsupported-info error if the info isn't recognized.
    protected onTransportInfo(changes: Jingle, cb: ActionCallback) {
        cb({
            condition: 'feature-not-implemented',
            jingleError: 'unsupported-info',
            type: 'modify'
        });
    }

    // It is mandatory to reply to a content-add action with either
    // a content-accept or content-reject.
    protected onContentAdd(changes: Jingle, cb: ActionCallback) {
        // Allow ack for the content-add to be sent.
        cb();

        this.send(Action.ContentReject, {
            reason: {
                condition: 'failed-application',
                text: 'content-add is not supported'
            }
        });
    }

    protected onContentAccept(changes: Jingle, cb: ActionCallback) {
        cb({ condition: 'bad-request' });
    }

    protected onContentReject(changes: Jingle, cb: ActionCallback) {
        cb({ condition: 'bad-request' });
    }

    protected onContentModify(changes: Jingle, cb: ActionCallback) {
        cb({ condition: 'bad-request' });
    }

    protected onContentRemove(changes: Jingle, cb: ActionCallback) {
        cb({ condition: 'bad-request' });
    }

    // It is mandatory to reply to a transport-add action with either
    // a transport-accept or transport-reject.
    protected onTransportReplace(changes: Jingle, cb: ActionCallback) {
        // Allow ack for the transport-replace be sent.
        cb();

        this.send(Action.TransportReject, {
            reason: {
                condition: 'failed-application',
                text: 'transport-replace is not supported'
            }
        });
    }

    protected onTransportAccept(changes: Jingle, cb: ActionCallback) {
        cb({ condition: 'bad-request' });
    }

    protected onTransportReject(changes: Jingle, cb: ActionCallback) {
        cb({ condition: 'bad-request' });
    }
}
