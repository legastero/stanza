import expect from 'expect';
import { Session as GenericSession, SessionManager } from '../../src/jingle';

// tslint:disable no-identical-functions

const selfID = 'zuser@example.com';
const peerID = 'peer@example.com';

test('Reject content-add by default', done => {
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
            done();
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

test('Reject transport-replace by default', done => {
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
            done();
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

test('Return error for unknown session-info action', done => {
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
            done();
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

test('Return error for unknown description-info action', done => {
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
        done();
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

test('Return error for unknown transport-info action', done => {
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
        done();
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
