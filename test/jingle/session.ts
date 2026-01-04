import { JingleAction } from '../../src/Constants';
import { Session as GenericSession, SessionManager } from '../../src/jingle';

const selfID = 'zuser@example.com';
const peerID = 'peer@example.com';

class StubSession extends GenericSession {
    constructor(opts: any) {
        super(opts);
    }
    public start() {
        this.state = 'pending';
        this.send(JingleAction.SessionInitiate, {
            contents: [
                {
                    application: { applicationType: 'stub' },
                    creator: 'initiator',
                    name: 'test',
                    transport: { transportType: 'stub' }
                }
            ]
        });
    }
    public accept() {
        this.state = 'active';
        this.send(JingleAction.SessionAccept, {
            contents: [
                {
                    application: { applicationType: 'stub' },
                    creator: 'initiator',
                    name: 'test',
                    transport: { transportType: 'stub' }
                }
            ]
        });
    }
}

test('Test accepting base session', () => {
    expect.assertions(3);

    const jingle = new SessionManager({
        selfID
    });

    let sentResult = false;

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            if (!sentResult) {
                expect(data).toEqual({
                    id: '123',
                    to: peerID,
                    type: 'result'
                });
                sentResult = true;
            } else {
                delete data.id;
                expect(data).toEqual({
                    jingle: {
                        action: JingleAction.SessionTerminate,
                        reason: {
                            condition: 'unsupported-applications'
                        },
                        sid: 'sid123'
                    },
                    to: peerID,
                    type: 'set'
                });
                resolve();
            }
        });

        jingle.on('incoming', session => {
            expect(session).toBeTruthy();
            session.accept();
        });

        jingle.process({
            from: peerID,
            id: '123',
            jingle: {
                action: JingleAction.SessionInitiate,
                contents: [
                    {
                        application: {
                            applicationType: 'test'
                        },
                        creator: 'initiator',
                        name: 'test',
                        transport: {
                            transportType: 'test'
                        }
                    }
                ],
                sid: 'sid123'
            },
            to: selfID,
            type: 'set'
        });
    });
});

test('Test accepting stub session', () => {
    expect.assertions(3);

    const jingle = new SessionManager({
        prepareSession: meta => {
            if (meta.applicationTypes.indexOf('stub') >= 0) {
                return new StubSession(meta);
            }
        },
        selfID
    });

    let sentResult = false;

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            if (!sentResult) {
                expect(data).toEqual({
                    id: '123',
                    to: peerID,
                    type: 'result'
                });
                sentResult = true;
            } else {
                delete data.id;
                expect(data).toEqual({
                    jingle: {
                        action: JingleAction.SessionAccept,
                        contents: [
                            {
                                application: {
                                    applicationType: 'stub'
                                },
                                creator: 'initiator',
                                name: 'test',
                                transport: {
                                    transportType: 'stub'
                                }
                            }
                        ],
                        sid: 'sid123'
                    },
                    to: peerID,
                    type: 'set'
                });
                resolve();
            }
        });

        jingle.on('incoming', session => {
            expect(session).toBeTruthy();
            session.accept();
        });

        jingle.process({
            from: peerID,
            id: '123',
            jingle: {
                action: JingleAction.SessionInitiate,
                contents: [
                    {
                        application: {
                            applicationType: 'stub'
                        },
                        creator: 'initiator',
                        name: 'test',
                        transport: {
                            transportType: 'stub'
                        }
                    }
                ],
                sid: 'sid123'
            },
            to: selfID,
            type: 'set'
        });
    });
});

test('Test starting base session', () => {
    expect.assertions(2);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        initiator: true,
        parent: jingle,
        peerID
    });

    return new Promise<void>(resolve => {
        jingle.on('terminated', session => {
            expect(session.sid).toBe(sess.sid);
            expect(session.state).toBe('ended');
            resolve();
        });

        jingle.addSession(sess);
        sess.start();
    });
});

test('Test starting stub session', () => {
    expect.assertions(3);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new StubSession({
        initiator: true,
        peerID
    });

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            delete data.id;
            expect(data).toEqual({
                jingle: {
                    action: JingleAction.SessionInitiate,
                    contents: [
                        {
                            application: {
                                applicationType: 'stub'
                            },
                            creator: 'initiator',
                            name: 'test',
                            transport: {
                                transportType: 'stub'
                            }
                        }
                    ],
                    sid: sess.sid
                },
                to: peerID,
                type: 'set'
            });
            resolve();
        });

        jingle.on('outgoing', session => {
            expect(session.sid).toBe(sess.sid);
            expect(session.state).toBe('pending');
        });

        jingle.addSession(sess);
        sess.start();
    });
});

test('Test declining a session', () => {
    expect.assertions(3);

    const jingle = new SessionManager({
        prepareSession: meta => {
            if (meta.applicationTypes.indexOf('stub') >= 0) {
                return new StubSession(meta);
            }
        },
        selfID
    });

    let sentResult = false;

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            if (!sentResult) {
                expect(data).toEqual({
                    id: '123',
                    to: peerID,
                    type: 'result'
                });
                sentResult = true;
            } else {
                delete data.id;
                expect(data).toEqual({
                    jingle: {
                        action: JingleAction.SessionTerminate,
                        reason: {
                            condition: 'decline'
                        },
                        sid: 'sid123'
                    },
                    to: peerID,
                    type: 'set'
                });
                resolve();
            }
        });

        jingle.on('incoming', session => {
            expect(session).toBeTruthy();
            session.decline();
        });

        jingle.process({
            from: peerID,
            id: '123',
            jingle: {
                action: JingleAction.SessionInitiate,
                contents: [
                    {
                        application: {
                            applicationType: 'stub'
                        },
                        creator: 'initiator',
                        name: 'test',
                        transport: {
                            transportType: 'stub'
                        }
                    }
                ],
                sid: 'sid123'
            },
            to: selfID,
            type: 'set'
        });
    });
});

test('Test cancelling a pending session', () => {
    expect.assertions(2);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new StubSession({
        initiator: true,
        peerID
    });

    let started = false;

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            delete data.id;
            if (!started) {
                expect(data).toEqual({
                    jingle: {
                        action: JingleAction.SessionInitiate,
                        contents: [
                            {
                                application: {
                                    applicationType: 'stub'
                                },
                                creator: 'initiator',
                                name: 'test',
                                transport: {
                                    transportType: 'stub'
                                }
                            }
                        ],
                        sid: sess.sid
                    },
                    to: peerID,
                    type: 'set'
                });
                started = true;
            } else {
                expect(data).toEqual({
                    jingle: {
                        action: JingleAction.SessionTerminate,
                        reason: {
                            condition: 'cancel'
                        },
                        sid: sess.sid
                    },
                    to: peerID,
                    type: 'set'
                });
                resolve();
            }
        });

        jingle.addSession(sess);
        sess.start();
        sess.cancel();
    });
});

test('Test ending a session (successful session)', () => {
    expect.assertions(3);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new StubSession({
        initiator: true,
        peerID
    });

    jingle.addSession(sess);
    sess.state = 'active';

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            delete data.id;
            expect(data).toEqual({
                jingle: {
                    action: JingleAction.SessionTerminate,
                    reason: {
                        condition: 'success'
                    },
                    sid: sess.sid
                },
                to: peerID,
                type: 'set'
            });
            resolve();
        });

        jingle.on('terminated', session => {
            expect(session.sid).toBe(sess.sid);
            expect(session.state).toBe('ended');
        });

        sess.end();
    });
});

test('Test ending a session (non-successful session)', () => {
    expect.assertions(3);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new StubSession({
        initiator: true,
        peerID
    });

    jingle.addSession(sess);
    sess.state = 'active';

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            delete data.id;
            expect(data).toEqual({
                jingle: {
                    action: JingleAction.SessionTerminate,
                    reason: {
                        condition: 'failed-application',
                        text: 'not working'
                    },
                    sid: sess.sid
                },
                to: peerID,
                type: 'set'
            });
            resolve();
        });

        jingle.on('terminated', session => {
            expect(session.sid).toBe(sess.sid);
            expect(session.state).toBe('ended');
        });

        sess.end({
            condition: 'failed-application',
            text: 'not working'
        });
    });
});

test('Test pending actions', () => {
    const jingle = new SessionManager({
        selfID
    });

    const sess = new StubSession({
        initiator: true,
        peerID,
        sid: 'sid123'
    });

    jingle.addSession(sess);

    sess.state = 'active';

    expect(sess.pendingAction).toBeFalsy();

    sess.send(JingleAction.TransportReplace, {});

    expect(sess.pendingAction).toBe(JingleAction.TransportReplace);

    jingle.process({
        from: peerID,
        jingle: {
            sid: 'sid123'
        },
        type: 'result'
    });

    expect(sess.pendingAction).toBeFalsy();

    sess.send(JingleAction.TransportReplace, {});

    expect(sess.pendingAction).toBe(JingleAction.TransportReplace);

    jingle.process({
        from: peerID,
        jingle: {
            sid: 'sid123'
        },
        type: 'error'
    });

    expect(sess.pendingAction).toBeFalsy();
});

test('Test connectionState', () => {
    const jingle = new SessionManager({
        selfID
    });

    const sess = new StubSession({
        initiator: true,
        parent: jingle,
        peerID,
        sid: 'sid123'
    });

    jingle.on('connectionState', (session, connectionState) => {
        expect(session.sid).toBe(sess.sid);
        expect(connectionState).toBeTruthy();
    });

    expect(sess.connectionState).toBe('starting');

    sess.connectionState = 'connecting';
    sess.connectionState = 'connecting';
    sess.connectionState = 'connecting';
    sess.connectionState = 'connecting';
    sess.connectionState = 'connecting';

    expect(sess.connectionState).toBe('connecting');

    sess.connectionState = 'connected';

    expect(sess.connectionState).toBe('connected');

    sess.connectionState = 'disconnected';

    expect(sess.connectionState).toBe('disconnected');

    sess.connectionState = 'interrupted';

    expect(sess.connectionState).toBe('interrupted');
});
