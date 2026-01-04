import { Session as GenericSession, SessionManager } from '../../src/jingle';

const selfID = 'zuser@example.com';
const peerID = 'peer@example.com';

test('Reject content-add by default', () => {
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
    sess.state = 'active';

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
                        action: 'content-reject',
                        reason: {
                            condition: 'failed-application',
                            text: 'content-add is not supported'
                        },
                        sid: 'sid123'
                    },
                    to: peerID,
                    type: 'set'
                });
                resolve();
            }
        });

        jingle.process({
            from: peerID,
            id: '123',
            jingle: {
                action: 'content-add',
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

test('Reject transport-replace by default', () => {
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
    sess.state = 'active';

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
                        action: 'transport-reject',
                        reason: {
                            condition: 'failed-transport',
                            text: 'transport-replace is not supported'
                        },
                        sid: 'sid123'
                    },
                    to: peerID,
                    type: 'set'
                });
                resolve();
            }
        });

        jingle.process({
            from: peerID,
            id: '123',
            jingle: {
                action: 'transport-replace',
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

test('Return error for unknown session-info action', () => {
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
    sess.state = 'active';

    let sentError = false;

    return new Promise<void>(resolve => {
        jingle.on('send', data => {
            if (!sentError) {
                expect(data).toEqual({
                    error: {
                        condition: 'feature-not-implemented',
                        jingleError: 'unsupported-info',
                        type: 'modify'
                    },
                    id: '123',
                    to: peerID,
                    type: 'error'
                });
                sentError = true;
            } else {
                expect(data).toEqual({
                    id: '123',
                    to: peerID,
                    type: 'result'
                });
                resolve();
            }
        });

        // Should generate an error because of unknownInfoData
        jingle.process({
            from: peerID,
            id: '123',
            jingle: {
                action: 'session-info',
                info: {
                    infoType: 'unknownInfoData'
                },
                sid: 'sid123'
            },
            to: selfID,
            type: 'set'
        });

        // Should generate a normal ack
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

test('Return error for unknown description-info action', () => {
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
                    condition: 'feature-not-implemented',
                    jingleError: 'unsupported-info',
                    type: 'modify'
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
                action: 'description-info',
                sid: 'sid123'
            },
            to: selfID,
            type: 'set'
        });
    });
});

test('Return error for unknown transport-info action', () => {
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
                    condition: 'feature-not-implemented',
                    jingleError: 'unsupported-info',
                    type: 'modify'
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
                action: 'transport-info',
                sid: 'sid123'
            },
            to: selfID,
            type: 'set'
        });
    });
});
