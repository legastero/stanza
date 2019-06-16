const test = require('tape');
import { Session as GenericSession, SessionManager } from '../../src/jingle';

test('Reject content-add by default', function(t) {
    t.plan(2);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid123',
        parent: jingle
    });
    jingle.addSession(sess);
    sess.state = 'active';

    let sentResult = false;

    jingle.on('send', function(data) {
        if (!sentResult) {
            t.same(data, {
                id: '123',
                to: 'peer@example.com',
                type: 'result'
            });
            sentResult = true;
        } else {
            delete data.id;
            t.same(data, {
                jingle: {
                    action: 'content-reject',
                    reason: {
                        condition: 'failed-application',
                        text: 'content-add is not supported'
                    },
                    sid: 'sid123'
                },
                to: 'peer@example.com',
                type: 'set'
            });
        }
    });

    jingle.process({
        from: 'peer@example.com',
        id: '123',
        jingle: {
            action: 'content-add',
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

test('Reject transport-replace by default', function(t) {
    t.plan(2);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid123'
    });
    jingle.addSession(sess);
    sess.state = 'active';

    let sentResult = false;
    jingle.on('send', function(data) {
        if (!sentResult) {
            t.same(data, {
                id: '123',
                to: 'peer@example.com',
                type: 'result'
            });
            sentResult = true;
        } else {
            delete data.id;
            t.same(data, {
                jingle: {
                    action: 'transport-reject',
                    reason: {
                        condition: 'failed-application',
                        text: 'transport-replace is not supported'
                    },
                    sid: 'sid123'
                },
                to: 'peer@example.com',
                type: 'set'
            });
        }
    });

    jingle.process({
        from: 'peer@example.com',
        id: '123',
        jingle: {
            action: 'transport-replace',
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

test('Return error for unknown session-info action', function(t) {
    t.plan(2);

    const jingle = new SessionManager({
        selfID: 'zuser@example.com'
    });

    const sess = new GenericSession({
        peerID: 'peer@example.com',
        sid: 'sid123'
    });
    jingle.addSession(sess);
    sess.state = 'active';

    let sentError = false;
    jingle.on('send', function(data) {
        if (!sentError) {
            t.same(data, {
                error: {
                    condition: 'feature-not-implemented',
                    jingleError: 'unsupported-info',
                    type: 'modify'
                },
                id: '123',
                to: 'peer@example.com',
                type: 'error'
            });
            sentError = true;
        } else {
            t.same(data, {
                id: '123',
                to: 'peer@example.com',
                type: 'result'
            });
        }
    });

    // Should generate an error because of unknownInfoData
    jingle.process({
        from: 'peer@example.com',
        id: '123',
        jingle: {
            action: 'session-info',
            info: {
                infoType: 'unknownInfoData'
            },
            sid: 'sid123'
        },
        to: 'zuser@example.com',
        type: 'set'
    });

    // Should generate a normal ack
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

test('Return error for unknown description-info action', function(t) {
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
                condition: 'feature-not-implemented',
                jingleError: 'unsupported-info',
                type: 'modify'
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
            action: 'description-info',
            sid: 'sid123'
        },
        to: 'zuser@example.com',
        type: 'set'
    });
});

test('Return error for unknown transport-info action', function(t) {
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
                condition: 'feature-not-implemented',
                jingleError: 'unsupported-info',
                type: 'modify'
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
            action: 'transport-info',
            sid: 'sid123'
        },
        to: 'zuser@example.com',
        type: 'set'
    });
});
