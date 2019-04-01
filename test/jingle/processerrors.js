const test = require('tape');
import { Session as GenericSession, SessionManager } from '../../src/jingle';

test('Test session-initiate with no contents fails', function(t) {
    t.plan(1);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    jingle.on('send', function(data) {
        t.same(data, {
            error: {
                condition: 'bad-request',
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
            contents: [],
            sid: 'sid123'
        },
        to: 'zuser@example.com',
        type: 'set'
    });
});

test('Test session action from wrong sender', function(t) {
    t.plan(1);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'otherpeer@example.com',
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'pending';

    jingle.on('send', function(data) {
        t.same(data, {
            error: {
                condition: 'item-not-found',
                jingleError: 'unknown-session',
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
            action: 'session-info',
            sid: 'sid123'
        },
        to: 'zuser@example.com',
        type: 'set'
    });
});

test('Duplicate session-accept', function(t) {
    t.plan(1);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid123'
    });

    jingle.addSession(sess);
    sess.state = 'active';

    jingle.on('send', function(data) {
        t.same(data, {
            error: {
                condition: 'unexpected-request',
                jingleError: 'out-of-order',
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
            action: 'session-accept',
            sid: 'sid123'
        },
        to: 'zuser@example.com',
        type: 'set'
    });
});

test('Session-initiate after session accepted', function(t) {
    t.plan(1);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid123'
    });

    jingle.addSession(sess);
    sess.state = 'active';

    jingle.on('send', function(data) {
        t.same(data, {
            error: {
                condition: 'unexpected-request',
                jingleError: 'out-of-order',
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

test('Test session action for unknown session', function(t) {
    t.plan(1);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'otherpeer@example.com',
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'pending';

    jingle.on('send', function(data) {
        t.same(data, {
            error: {
                condition: 'item-not-found',
                jingleError: 'unknown-session',
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
            action: 'session-info',
            sid: 'sidunknown'
        },
        to: 'zuser@example.com',
        type: 'set'
    });
});

test('Test new session with duplicate sid', function(t) {
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

    sess.state = 'active';

    jingle.on('send', function(data) {
        t.same(data, {
            error: {
                condition: 'service-unavailable',
                type: 'cancel'
            },
            id: '123',
            to: 'otherpeer@example.com',
            type: 'error'
        });
    });

    jingle.process({
        from: 'otherpeer@example.com',
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

test('Test bad actions', function(t) {
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

    sess.state = 'active';

    jingle.on('send', function(data) {
        t.same(data, {
            error: {
                condition: 'bad-request',
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
            action: 'welp',
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
