const test = require('tape');
import { Session as GenericSession, SessionManager } from '../../src/jingle';

// We need a Stub Session that acts more like how we'd
// expect real session types to work, instead of ending
// itself when trying to start/accept like the GenericSession.
class StubSession extends GenericSession {
    constructor(opts) {
        super(opts);
    }
    start() {
        this.state = 'pending';
        this.send('session-initiate', {
            contents: [
                {
                    application: { applicationType: 'stub' },
                    transport: { transportType: 'stub' }
                }
            ]
        });
    }
    accept() {
        this.state = 'active';
        this.send('session-accept', {
            contents: [
                {
                    application: { applicationType: 'stub' },
                    transport: { transportType: 'stub' }
                }
            ]
        });
    }
}

test('Test accepting base session', function(t) {
    t.plan(3);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    let sentResult = false;
    jingle.on('send', function(data) {
        if (!sentResult) {
            t.same(data, {
                id: '123',
                to: 'peer@example.com',
                type: 'result'
            });
            sentResult = true;
        } else {
            // The GenericSession instance doesn't allow for accepting
            // sessions, so we'll test that we successfully terminated
            // the session instead.
            delete data.id;
            t.same(data, {
                jingle: {
                    action: 'session-terminate',
                    reason: {
                        condition: 'unsupported-applications'
                    },
                    sid: 'sid123'
                },
                to: 'peer@example.com',
                type: 'set'
            });
        }
    });

    jingle.on('incoming', function(session) {
        t.ok(session);
        session.accept();
    });

    jingle.process({
        from: 'peer@example.com',
        id: '123',
        jingle: {
            action: 'session-initiate',
            contents: [
                {
                    application: {
                        applicationType: 'test'
                    },
                    transport: {
                        transportType: 'test'
                    }
                }
            ],
            sid: 'sid123'
        },
        to: 'zuser@example.com',
        type: 'set'
    });
});

test('Test accepting stub session', function(t) {
    t.plan(3);

    const jingle = new SessionManager({
        prepareSession: meta => {
            if (meta.applicationTypes.indexOf('stub') >= 0) {
                return new StubSession(meta);
            }
        },
        selfID: 'zuser@example.com'
    });

    let sentResult = false;
    jingle.on('send', function(data) {
        if (!sentResult) {
            t.same(data, {
                id: '123',
                to: 'peer@example.com',
                type: 'result'
            });
            sentResult = true;
        } else {
            delete data.id;
            t.same(data, {
                jingle: {
                    action: 'session-accept',
                    contents: [
                        {
                            application: {
                                applicationType: 'stub'
                            },
                            transport: {
                                transportType: 'stub'
                            }
                        }
                    ],
                    sid: 'sid123'
                },
                to: 'peer@example.com',
                type: 'set'
            });
        }
    });

    jingle.on('incoming', function(session) {
        t.ok(session);
        session.accept();
    });

    jingle.process({
        from: 'peer@example.com',
        id: '123',
        jingle: {
            action: 'session-initiate',
            contents: [
                {
                    application: {
                        applicationType: 'stub'
                    },
                    transport: {
                        transportType: 'stub'
                    }
                }
            ],
            sid: 'sid123'
        },
        to: 'zuser@example.com',
        type: 'set'
    });
});

test('Test starting base session', function(t) {
    t.plan(2);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        initiator: true,
        peerID: 'peer@example.com'
    });

    // Base sessions can't be started, and will terminate
    // on .start()
    jingle.on('terminated', function(session) {
        t.equal(session.sid, sess.sid);
        t.equal(session.state, 'ended');
    });

    jingle.addSession(sess);
    sess.start();
});

test('Test starting stub session', function(t) {
    t.plan(3);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new StubSession({
        initiator: true,
        peerID: 'peer@example.com'
    });

    jingle.on('send', function(data) {
        delete data.id;
        t.same(data, {
            jingle: {
                action: 'session-initiate',
                contents: [
                    {
                        application: {
                            applicationType: 'stub'
                        },
                        transport: {
                            transportType: 'stub'
                        }
                    }
                ],
                sid: sess.sid
            },
            to: 'peer@example.com',
            type: 'set'
        });
    });

    jingle.on('outgoing', function(session) {
        t.equal(session.sid, sess.sid);
        t.equal(session.state, 'pending');
    });

    jingle.addSession(sess);
    sess.start();
});

test('Test declining a session', function(t) {
    t.plan(3);

    const jingle = new SessionManager({
        prepareSession: meta => {
            if (meta.applicationTypes.indexOf('stub') >= 0) {
                return new StubSession(meta);
            }
        },
        selfID: 'zuser@example.com'
    });

    let sentResult = false;
    jingle.on('send', function(data) {
        if (!sentResult) {
            t.same(data, {
                id: '123',
                to: 'peer@example.com',
                type: 'result'
            });
            sentResult = true;
        } else {
            delete data.id;
            t.same(data, {
                jingle: {
                    action: 'session-terminate',
                    reason: {
                        condition: 'decline'
                    },
                    sid: 'sid123'
                },
                to: 'peer@example.com',
                type: 'set'
            });
        }
    });

    jingle.on('incoming', function(session) {
        t.ok(session);
        session.decline();
    });

    jingle.process({
        from: 'peer@example.com',
        id: '123',
        jingle: {
            action: 'session-initiate',
            contents: [
                {
                    application: {
                        applicationType: 'stub'
                    },
                    transport: {
                        transportType: 'stub'
                    }
                }
            ],
            sid: 'sid123'
        },
        to: 'zuser@example.com',
        type: 'set'
    });
});

test('Test cancelling a pending session', function(t) {
    t.plan(2);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new StubSession({
        initiator: true,
        peerID: 'peer@example.com'
    });

    let started = false;
    jingle.on('send', function(data) {
        delete data.id;
        if (!started) {
            t.same(data, {
                jingle: {
                    action: 'session-initiate',
                    contents: [
                        {
                            application: {
                                applicationType: 'stub'
                            },
                            transport: {
                                transportType: 'stub'
                            }
                        }
                    ],
                    sid: sess.sid
                },
                to: 'peer@example.com',
                type: 'set'
            });
            started = true;
        } else {
            t.same(data, {
                jingle: {
                    action: 'session-terminate',
                    reason: {
                        condition: 'cancel'
                    },
                    sid: sess.sid
                },
                to: 'peer@example.com',
                type: 'set'
            });
        }
    });

    jingle.addSession(sess);
    sess.start();
    sess.cancel();
});

test('Test ending a session (successful session)', function(t) {
    t.plan(3);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new StubSession({
        initiator: true,
        peerID: 'peer@example.com'
    });

    jingle.addSession(sess);

    sess.state = 'active';

    jingle.on('send', function(data) {
        delete data.id;
        t.same(data, {
            jingle: {
                action: 'session-terminate',
                reason: {
                    condition: 'success'
                },
                sid: sess.sid
            },
            to: 'peer@example.com',
            type: 'set'
        });
    });

    jingle.on('terminated', function(session) {
        t.equal(session.sid, sess.sid);
        t.equal(session.state, 'ended');
    });

    sess.end();
});

test('Test ending a session (non-successful session)', function(t) {
    t.plan(3);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new StubSession({
        initiator: true,
        peerID: 'peer@example.com'
    });

    jingle.addSession(sess);

    sess.state = 'active';

    jingle.on('send', function(data) {
        delete data.id;
        t.same(data, {
            jingle: {
                action: 'session-terminate',
                reason: {
                    condition: 'failed-application',
                    text: 'not working'
                },
                sid: sess.sid
            },
            to: 'peer@example.com',
            type: 'set'
        });
    });

    jingle.on('terminated', function(session) {
        t.equal(session.sid, sess.sid);
        t.equal(session.state, 'ended');
    });

    sess.end({
        condition: 'failed-application',
        text: 'not working'
    });
});

test('Test pending actions', function(t) {
    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new StubSession({
        initiator: true,
        peerID: 'peer@example.com',
        sid: 'sid123'
    });

    jingle.addSession(sess);

    sess.state = 'active';

    t.notOk(sess.pendingAction);

    sess.send('transport-replace');

    t.equal(sess.pendingAction, 'transport-replace');

    jingle.process({
        from: 'peer@example.com',
        jingle: {
            sid: 'sid123'
        },
        type: 'result'
    });

    t.notOk(sess.pendingAction);

    sess.send('transport-replace');

    t.equal(sess.pendingAction, 'transport-replace');

    jingle.process({
        from: 'peer@example.com',
        jingle: {
            sid: 'sid123'
        },
        type: 'error'
    });

    t.notOk(sess.pendingAction);

    t.end();
});

test('Test connectionState', function(t) {
    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new StubSession({
        initiator: true,
        peerID: 'peer@example.com',
        sid: 'sid123',
        parent: jingle
    });

    jingle.on('connectionState', function(session, connectionState) {
        t.equal(session.sid, sess.sid);
        t.ok(connectionState);
    });

    t.equal(sess.connectionState, 'starting');

    // Should only trigger a change event once
    sess.connectionState = 'connecting';
    sess.connectionState = 'connecting';
    sess.connectionState = 'connecting';
    sess.connectionState = 'connecting';
    sess.connectionState = 'connecting';

    t.equal(sess.connectionState, 'connecting');

    sess.connectionState = 'connected';

    t.equal(sess.connectionState, 'connected');

    sess.connectionState = 'disconnected';

    t.equal(sess.connectionState, 'disconnected');

    sess.connectionState = 'interrupted';

    t.equal(sess.connectionState, 'interrupted');
    t.end();
});
