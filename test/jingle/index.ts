import test from 'tape';
import { Session as GenericSession, SessionManager } from '../../src/jingle';

import './processerrors';
import './reject';
import './session';
import './tiebreaking';

const selfID = 'zuser@example.com';
const peerID = 'peer@example.com';
const turnServer = 'turn:example.com';

test('Test session-initiate', t => {
    t.plan(2);

    const jingle = new SessionManager({
        selfID
    });

    jingle.on('send', data => {
        t.same(data, {
            id: '123',
            to: peerID,
            type: 'result'
        });
    });

    jingle.on('incoming', session => {
        t.ok(session);
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

test('Test ending sessions for peer', t => {
    t.plan(2);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID,
        sid: 'sid123'
    });
    jingle.addSession(sess);

    const sess2 = new GenericSession({
        parent: jingle,
        peerID,
        sid: 'sid124'
    });
    jingle.addSession(sess2);

    const sess3 = new GenericSession({
        parent: jingle,
        peerID: 'otherpeer@example.com',
        sid: 'sid125'
    });
    jingle.addSession(sess3);

    jingle.on('terminated', session => {
        t.equal(session.peerID, peerID);
    });

    jingle.endPeerSessions(peerID);
});

test('Test ending sessions for peer with no sessions', t => {
    const jingle = new SessionManager({
        selfID
    });

    jingle.endPeerSessions(peerID);

    t.notOk(jingle.peers[peerID]);
    t.end();
});

test('Test ending sessions for all peers', t => {
    t.plan(3);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID,
        sid: 'sid123'
    });
    jingle.addSession(sess);

    const sess2 = new GenericSession({
        parent: jingle,
        peerID,
        sid: 'sid124'
    });
    jingle.addSession(sess2);

    const sess3 = new GenericSession({
        parent: jingle,
        peerID: 'otherpeer@example.com',
        sid: 'sid125'
    });
    jingle.addSession(sess3);

    jingle.on('terminated', session => {
        t.ok(session);
    });

    jingle.endAllSessions();
});

test('Prepare session', t => {
    t.plan(1);

    const jingle = new SessionManager({
        prepareSession: meta => {
            t.ok(meta);
            return new GenericSession(meta);
        },
        selfID
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

test('Add ICE server', t => {
    const jingle = new SessionManager({
        iceServers: [],
        selfID
    });

    jingle.addICEServer({
        urls: turnServer
    });

    t.same(jingle.iceServers, [{ urls: turnServer }]);

    t.end();
});

test('Add ICE server as just a string', t => {
    const jingle = new SessionManager({
        iceServers: [],
        selfID
    });

    jingle.addICEServer(turnServer);

    t.same(jingle.iceServers, [{ urls: turnServer }]);

    t.end();
});
