import { createClient } from '../../src';
import { ReceivedMessage } from '../../src/protocol';

test('MUC chat', () => {
    const client = createClient({});

    const incoming: ReceivedMessage = {
        body: 'yayyyy',
        from: 'room@rooms.test/member',
        to: 'tester@localhost',
        type: 'groupchat'
    };

    client.on('groupchat', msg => {
        expect(msg).toStrictEqual(incoming);
    });

    client.emit('message', incoming);
});

test('MUC subject', () => {
    const client = createClient({});

    const incoming: ReceivedMessage = {
        hasSubject: true,
        from: 'room@rooms.test/admin',
        to: 'tester@localhost',
        subject: 'Room subject',
        type: 'groupchat'
    };

    client.on('muc:topic', msg => {
        expect(msg).toStrictEqual({
            from: 'room@rooms.test/admin',
            room: 'room@rooms.test',
            topic: 'Room subject'
        });
    });

    client.emit('message', incoming);
});

test('MUC message with body and subject', () => {
    const client = createClient({});

    const incoming: ReceivedMessage = {
        body: 'Message body.',
        hasSubject: true,
        from: 'room@rooms.test/admin',
        to: 'tester@localhost',
        subject: 'Message subject',
        type: 'groupchat'
    };

    // XEP-0045 section 7.2.15: "Note: In accordance with the core definition of XML stanzas, any
    // message can contain a <subject/> element; only a message that contains a <subject/> but no
    // <body/> element shall be considered a subject change for MUC purposes.
    const callback = jest.fn()
    client.on('muc:topic', callback);

    client.on('groupchat', msg => {
        expect(msg).toStrictEqual(incoming);
    });

    client.emit('message', incoming);
    expect(callback).not.toHaveBeenCalled();
});

test('MUC empty subject', () => {
    const client = createClient({});

    const incoming: ReceivedMessage = {
        hasSubject: true,
        from: 'room@rooms.test/admin',
        to: 'tester@localhost',
        subject: '',
        type: 'groupchat'
    };

    client.on('muc:topic', msg => {
        expect(msg).toStrictEqual({
            from: 'room@rooms.test/admin',
            room: 'room@rooms.test',
            topic: ''
        });
    });

    client.emit('message', incoming);
});

test('MUC mediated invite', () => {
    const client = createClient({});

    const incoming: ReceivedMessage = {
        from: 'room@rooms.test',
        muc: {
            type: 'info',
            invite: [
                {
                    from: 'room@rooms.test/member',
                    reason: 'because',
                    thread: '1-1-1'
                }
            ],
            password: 'secret'
        },
        to: 'tester@localhost',
        type: 'groupchat'
    };

    client.on('muc:invite', msg => {
        expect(msg).toStrictEqual({
            from: 'room@rooms.test/member',
            password: 'secret',
            reason: 'because',
            room: 'room@rooms.test',
            thread: '1-1-1',
            type: 'mediated'
        });
    });

    client.emit('message', incoming);
});

test('MUC direct invite', () => {
    const client = createClient({});

    const incoming: ReceivedMessage = {
        from: 'peer@localhost',
        muc: {
            type: 'direct-invite',
            jid: 'room@rooms.test',
            password: 'secret',
            reason: 'because',
            thread: '1-1-1'
        },
        to: 'tester@localhost',
        type: 'groupchat'
    };

    client.on('muc:invite', msg => {
        expect(msg).toStrictEqual({
            from: 'peer@localhost',
            password: 'secret',
            reason: 'because',
            room: 'room@rooms.test',
            thread: '1-1-1',
            type: 'direct'
        });
    });

    client.emit('message', incoming);
});

test('MUC PM and direct invite', () => {
    const client = createClient({});

    const incoming: ReceivedMessage = {
        from: 'peer@localhost',
        legacyMUC: {
            type: 'direct-invite',
            jid: 'room@rooms.test',
            password: 'secret',
            reason: 'because',
            thread: '1-1-1'
        },
        muc: {
            type: 'info'
        },
        to: 'tester@localhost',
        type: 'groupchat'
    };

    client.on('muc:invite', msg => {
        expect(msg).toStrictEqual({
            from: 'peer@localhost',
            password: 'secret',
            reason: 'because',
            room: 'room@rooms.test',
            thread: '1-1-1',
            type: 'direct'
        });
    });

    client.emit('message', incoming);
});

test('MUC declined invite', () => {
    const client = createClient({});

    const incoming: ReceivedMessage = {
        from: 'room@rooms.test',
        to: 'tester@localhost',
        type: 'groupchat',
        muc: {
            decline: {
                from: 'invited@localhost',
                reason: 'busy'
            },
            type: 'info'
        }
    };

    client.on('muc:declined', msg => {
        expect(msg).toStrictEqual({
            from: 'invited@localhost',
            room: 'room@rooms.test',
            reason: 'busy'
        });
    });

    client.emit('message', incoming);
});
