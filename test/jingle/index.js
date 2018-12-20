const test = require('tape');
import { Session as GenericSession, SessionManager } from '../../src/jingle';

import './processerrors';
import './reject';
import './session';
import './tiebreaking';

test('Test session-initiate', function(t) {
    t.plan(2);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    jingle.on('send', function(data) {
        t.same(data, {
            id: '123',
            to: 'peer@example.com',
            type: 'result'
        });
    });

    jingle.on('incoming', function(session) {
        t.ok(session);
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

test('Test ending sessions for peer', function(t) {
    t.plan(2);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid123'
    });
    jingle.addSession(sess);

    const sess2 = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid124'
    });
    jingle.addSession(sess2);

    const sess3 = new GenericSession({
        peerID: 'otherpeer@example.com',
        sid: 'sid125'
    });
    jingle.addSession(sess3);

    jingle.on('terminated', function(session) {
        t.equal(session.peerID, 'peer@example.com');
    });

    jingle.endPeerSessions('peer@example.com');
});

test('Test ending sessions for peer with no sessions', function(t) {
    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    jingle.endPeerSessions('peer@example.com');

    t.notOk(jingle.peers['peer@example.com']);
    t.end();
});

test('Test ending sessions for all peers', function(t) {
    t.plan(3);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid123'
    });
    jingle.addSession(sess);

    const sess2 = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid124'
    });
    jingle.addSession(sess2);

    const sess3 = new GenericSession({
        peerID: 'otherpeer@example.com',
        sid: 'sid125'
    });
    jingle.addSession(sess3);

    jingle.on('terminated', function(session) {
        t.ok(session);
    });

    jingle.endAllSessions();
});

test('Prepare session', function(t) {
    t.plan(1);

    const jingle = new SessionManager({
        prepareSession: meta => {
            t.ok(meta);
            return new GenericSession(meta);
        },
        selfID: 'zuser@example.com'
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

test('Add ICE server', function(t) {
    const jingle = new SessionManager({
        iceServers: [],
        selfID: 'zuser@example.com'
    });

    jingle.addICEServer({
        url: 'turn:example.com'
    });

    t.same(jingle.iceServers, [{ url: 'turn:example.com' }]);

    t.end();
});

test('Add ICE server as just a string', function(t) {
    const jingle = new SessionManager({
        iceServers: [],
        selfID: 'zuser@example.com'
    });

    jingle.addICEServer('turn:example.com');

    t.same(jingle.iceServers, [{ urls: 'turn:example.com' }]);

    t.end();
});
