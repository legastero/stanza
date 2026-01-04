import { Session as GenericSession, SessionManager } from '../../src/jingle';

const selfID = 'zuser@example.com';
const peerID = 'peer@example.com';
const otherPeerID = 'otherpeer@example.com';

test('Test session-initiate with no contents fails', () => {
    expect.assertions(1);

    const jingle = new SessionManager({
        selfID
    });

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            expect(data).toEqual({
                error: {
                    condition: 'bad-request',
                    type: 'cancel'
                },
                id: '123',
                to: peerID,
                type: 'error'
            });
            resolve();
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
});

test('Test session action from wrong sender', () => {
    expect.assertions(1);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID: otherPeerID,
        sid: 'sid123'
    });

    jingle.addSession(sess);
    sess.state = 'pending';

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            expect(data).toEqual({
                error: {
                    condition: 'item-not-found',
                    jingleError: 'unknown-session',
                    type: 'cancel'
                },
                id: '123',
                to: peerID,
                type: 'error'
            });
            resolve();
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
});

test('Duplicate session-accept', () => {
    expect.assertions(1);

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

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            expect(data).toEqual({
                error: {
                    condition: 'unexpected-request',
                    jingleError: 'out-of-order',
                    type: 'cancel'
                },
                id: '123',
                to: peerID,
                type: 'error'
            });
            resolve();
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
});

test('Session-initiate after session accepted', () => {
    expect.assertions(1);

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

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            expect(data).toEqual({
                error: {
                    condition: 'unexpected-request',
                    jingleError: 'out-of-order',
                    type: 'cancel'
                },
                id: '123',
                to: peerID,
                type: 'error'
            });
            resolve();
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
});

test('Test session action for unknown session', () => {
    expect.assertions(1);

    const jingle = new SessionManager({
        selfID
    });

    const sess = new GenericSession({
        parent: jingle,
        peerID: otherPeerID,
        sid: 'sid123'
    });

    jingle.addSession(sess);
    sess.state = 'pending';

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            expect(data).toEqual({
                error: {
                    condition: 'item-not-found',
                    jingleError: 'unknown-session',
                    type: 'cancel'
                },
                id: '123',
                to: peerID,
                type: 'error'
            });
            resolve();
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
});

test('Test new session with duplicate sid', () => {
    expect.assertions(1);

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

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            expect(data).toEqual({
                error: {
                    condition: 'service-unavailable',
                    type: 'cancel'
                },
                id: '123',
                to: otherPeerID,
                type: 'error'
            });
            resolve();
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
});

test('Test bad actions', () => {
    expect.assertions(1);

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

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            expect(data).toEqual({
                error: {
                    condition: 'bad-request',
                    type: 'cancel'
                },
                id: '123',
                to: peerID,
                type: 'error'
            });
            resolve();
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
});
