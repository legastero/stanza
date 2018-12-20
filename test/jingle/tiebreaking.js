const test = require('tape');
import { Session as GenericSession, SessionManager } from '../../src/jingle';

test('Test tie-break from duplicate sids', function(t) {
    t.plan(1);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'pending';
    sess.pendingApplicationTypes = ['test'];

    jingle.on('send', function(data) {
        t.same(data, {
            error: {
                condition: 'conflict',
                jingleCondition: 'tie-break',
                type: 'cancel'
            },
            id: '123',
            to: 'peer@example.com',
            type: 'error'
        });
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

test('Test tie-break from existing session', function(t) {
    t.plan(1);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        applicationTypes: ['othertest'],
        peerID: 'peer@example.com',
        sid: 'sid999'
    });
    jingle.addSession(sess);
    sess.state = 'pending';

    const sess2 = new GenericSession({
        applicationTypes: ['test'],
        peerID: 'peer@example.com',
        sid: 'sid998'
    });
    jingle.addSession(sess2);
    sess2.state = 'pending';

    jingle.on('send', function(data) {
        t.same(data, {
            error: {
                condition: 'conflict',
                jingleCondition: 'tie-break',
                type: 'cancel'
            },
            id: '123',
            to: 'peer@example.com',
            type: 'error'
        });
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

test('Test tie-break from pending action', function(t) {
    t.plan(1);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        initiator: true,
        peerID: 'peer@example.com',
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'active';
    sess.pendingAction = 'content-modify';

    jingle.on('send', function(data) {
        t.same(data, {
            error: {
                condition: 'conflict',
                jingleCondition: 'tie-break',
                type: 'cancel'
            },
            id: '123',
            to: 'peer@example.com',
            type: 'error'
        });
    });

    jingle.process({
        from: 'peer@example.com',
        id: '123',
        jingle: {
            action: 'content-modify',
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

test('Test terminate session from lost tie-break during startup', function(t) {
    t.plan(1);

    const jingle = new SessionManager({
        selfID: 'auser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'pending';

    jingle.on('terminated', function(session) {
        t.equal(session.sid, 'sid123');
    });

    jingle.process({
        error: {
            condition: 'conflict',
            jingleCondition: 'tie-break',
            type: 'cancel'
        },
        from: 'peer@example.com',
        id: '123',
        jingle: {
            sid: 'sid123'
        },
        to: 'auser@example.com',
        type: 'error'
    });
});
