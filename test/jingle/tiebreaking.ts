import test from 'tape';
import { Session as GenericSession, SessionManager } from '../../src/jingle';

// tslint:disable no-identical-functions

const selfID = 'zuser@example.com';
const peerID = 'peer@example.com';

test('Test tie-break from duplicate sids', t => {
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

    sess.state = 'pending';
    sess.pendingApplicationTypes = ['test'];

    jingle.on('send', data => {
        t.same(data, {
            error: {
                condition: 'conflict',
                jingleError: 'tie-break',
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

test('Test tie-break from existing session', t => {
    t.plan(1);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        applicationTypes: ['othertest'],
        parent: jingle,
        peerID,
        sid: 'sid999'
    });
    jingle.addSession(sess);
    sess.state = 'pending';

    const sess2 = new GenericSession({
        applicationTypes: ['test'],
        parent: jingle,
        peerID,
        sid: 'sid998'
    });
    jingle.addSession(sess2);
    sess2.state = 'pending';

    jingle.on('send', data => {
        t.same(data, {
            error: {
                condition: 'conflict',
                jingleError: 'tie-break',
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

test('Test tie-break from pending action', t => {
    t.plan(1);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        initiator: true,
        parent: jingle,
        peerID,
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'active';
    sess.pendingAction = 'content-modify';

    jingle.on('send', data => {
        t.same(data, {
            error: {
                condition: 'conflict',
                jingleError: 'tie-break',
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
            action: 'content-modify',
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

test('Test terminate session from lost tie-break during startup', t => {
    t.plan(1);

    const jingle = new SessionManager({
        selfID: 'auser@example.com'
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID,
        sid: 'sid123'
    });

    // We already sent a session request to the peer
    jingle.addSession(sess);

    sess.state = 'pending';

    jingle.on('terminated', session => {
        t.equal(session.sid, 'sid123');
    });

    jingle.process({
        error: {
            condition: 'conflict',
            jingleError: 'tie-break',
            type: 'cancel'
        },
        from: peerID,
        id: '123',
        jingle: {
            sid: 'sid123'
        },
        to: 'auser@example.com',
        type: 'error'
    });
});
