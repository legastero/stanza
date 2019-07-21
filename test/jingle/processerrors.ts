import test from 'tape';
import { Session as GenericSession, SessionManager } from '../../src/jingle';

// tslint:disable no-identical-functions

const selfID = 'zuser@example.com';
const peerID = 'peer@example.com';
const otherPeerID = 'otherpeer@example.com';

test('Test session-initiate with no contents fails', t => {
    t.plan(1);

    const jingle = new SessionManager({
        selfID
    });

    jingle.on('send', data => {
        t.same(data, {
            error: {
                condition: 'bad-request',
                type: 'cancel'
            },
            id: '123',
            to: peerID,
            type: 'error'
        });
    });

    jingle.process({
        from: peerID,
        id: '123',
        jingle: {
            action: 'session-initiate',
            contents: [],
            sid: 'sid123'
        },
        to: selfID,
        type: 'set'
    });
});

test('Test session action from wrong sender', t => {
    t.plan(1);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID: otherPeerID,
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'pending';

    jingle.on('send', data => {
        t.same(data, {
            error: {
                condition: 'item-not-found',
                jingleError: 'unknown-session',
                type: 'cancel'
            },
            id: '123',
            to: peerID,
            type: 'error'
        });
    });

    jingle.process({
        from: peerID,
        id: '123',
        jingle: {
            action: 'session-info',
            sid: 'sid123'
        },
        to: selfID,
        type: 'set'
    });
});

test('Duplicate session-accept', t => {
    t.plan(1);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID,
        sid: 'sid123'
    });

    jingle.addSession(sess);
    sess.state = 'active';

    jingle.on('send', data => {
        t.same(data, {
            error: {
                condition: 'unexpected-request',
                jingleError: 'out-of-order',
                type: 'cancel'
            },
            id: '123',
            to: peerID,
            type: 'error'
        });
    });

    jingle.process({
        from: peerID,
        id: '123',
        jingle: {
            action: 'session-accept',
            sid: 'sid123'
        },
        to: selfID,
        type: 'set'
    });
});

test('Session-initiate after session accepted', t => {
    t.plan(1);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID,
        sid: 'sid123'
    });

    jingle.addSession(sess);
    sess.state = 'active';

    jingle.on('send', data => {
        t.same(data, {
            error: {
                condition: 'unexpected-request',
                jingleError: 'out-of-order',
                type: 'cancel'
            },
            id: '123',
            to: peerID,
            type: 'error'
        });
    });

    jingle.process({
        from: peerID,
        id: '123',
        jingle: {
            action: 'session-initiate',
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

test('Test session action for unknown session', t => {
    t.plan(1);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID: otherPeerID,
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'pending';

    jingle.on('send', data => {
        t.same(data, {
            error: {
                condition: 'item-not-found',
                jingleError: 'unknown-session',
                type: 'cancel'
            },
            id: '123',
            to: peerID,
            type: 'error'
        });
    });

    jingle.process({
        from: peerID,
        id: '123',
        jingle: {
            action: 'session-info',
            sid: 'sidunknown'
        },
        to: selfID,
        type: 'set'
    });
});

test('Test new session with duplicate sid', t => {
    t.plan(1);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID,
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'active';

    jingle.on('send', data => {
        t.same(data, {
            error: {
                condition: 'service-unavailable',
                type: 'cancel'
            },
            id: '123',
            to: otherPeerID,
            type: 'error'
        });
    });

    jingle.process({
        from: otherPeerID,
        id: '123',
        jingle: {
            action: 'session-initiate',
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

test('Test bad actions', t => {
    t.plan(1);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID,
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'active';

    jingle.on('send', data => {
        t.same(data, {
            error: {
                condition: 'bad-request',
                type: 'cancel'
            },
            id: '123',
            to: peerID,
            type: 'error'
        });
    });

    jingle.process({
        from: peerID,
        id: '123',
        jingle: {
            action: 'welp' as any,
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
