import expect from 'expect';
import { Session as GenericSession, SessionManager } from '../../src/jingle';

const selfID = 'zuser@example.com';
const peerID = 'peer@example.com';
const turnServer = 'turn:example.com';

test('Test session-initiate', done => {
    expect.assertions(2);

    const jingle = new SessionManager({
        selfID
    });

    jingle.on('send', data => {
        expect(data).toEqual({
            id: '123',
            to: peerID,
            type: 'result'
        });
        done();
    });

    jingle.on('incoming', session => {
        expect(session).toBeTruthy();
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

test('Test ending sessions for peer', done => {
    expect.assertions(2);

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

    let terminatedCount = 0;

    jingle.on('terminated', session => {
        terminatedCount++;
        expect(session.peerID).toBe(peerID);

        if (terminatedCount == 2) {
            done();
        }
    });
    jingle.endPeerSessions(peerID);
});

test('Test ending sessions for peer with no sessions', () => {
    const jingle = new SessionManager({
        selfID
    });

    jingle.endPeerSessions(peerID);

    expect(jingle.peers[peerID]).toBeFalsy();
});

test('Test ending sessions for all peers', done => {
    expect.assertions(3);

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

    let terminatedCount = 0;
    jingle.on('terminated', session => {
        terminatedCount++;
        expect(session).toBeTruthy();

        if (terminatedCount === 3) {
            done();
        }
    });

    jingle.endAllSessions();
});

test('Prepare session', () => {
    expect.assertions(1);

    const jingle = new SessionManager({
        prepareSession: meta => {
            expect(meta).toBeTruthy();
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

test('Add ICE server', () => {
    const jingle = new SessionManager({
        iceServers: [],
        selfID
    });

    jingle.addICEServer({
        urls: turnServer
    });

    expect(jingle.iceServers).toEqual([{ urls: turnServer }]);
});

test('Add ICE server as just a string', () => {
    const jingle = new SessionManager({
        iceServers: [],
        selfID
    });

    jingle.addICEServer(turnServer);

    expect(jingle.iceServers).toEqual([{ urls: turnServer }]);
});
