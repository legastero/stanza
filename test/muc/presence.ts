import { createClient } from '../../src';
import { ReceivedPresence } from '../../src/protocol';

test('MUC available', () => {
    const client = createClient({});

    const incoming: ReceivedPresence = {
        from: 'room@rooms.test/peer',
        muc: {
            type: 'info'
        },
        to: 'tester@localhost'
    };

    client.on('muc:available', msg => {
        expect(msg).toStrictEqual(incoming);
    });

    client.emit('presence', incoming);
});

test('MUC unavailable', () => {
    const client = createClient({});

    const incoming: ReceivedPresence = {
        from: 'room@rooms.test/peer',
        muc: {
            type: 'info'
        },
        to: 'tester@localhost',
        type: 'unavailable'
    };

    client.on('muc:unavailable', msg => {
        expect(msg).toStrictEqual(incoming);
    });

    client.emit('presence', incoming);
});

test('MUC join', () => {
    const client = createClient({});

    const incoming: ReceivedPresence = {
        from: 'room@rooms.test/self',
        muc: {
            type: 'info',
            statusCodes: ['110']
        },
        to: 'tester@localhost'
    };

    client.on('muc:join', msg => {
        expect(msg).toStrictEqual(incoming);
    });

    client.emit('presence', incoming);
});

test('MUC join failed', () => {
    const client = createClient({});
    client.joiningRooms.set('room@rooms.test', { nick: 'self' });

    const incoming: ReceivedPresence = {
        from: 'room@rooms.test/self',
        type: 'error',
        to: 'tester@localhost'
    };

    client.on('muc:failed', msg => {
        expect(msg).toStrictEqual(incoming);
    });
    client.on('muc:error', msg => {
        expect(msg).toStrictEqual(incoming);
    });

    client.emit('presence', incoming);
});

test('MUC error', () => {
    const client = createClient({});
    client.joinedRooms.set('room@rooms.test', { nick: 'self' });

    const incoming: ReceivedPresence = {
        from: 'room@rooms.test/self',
        type: 'error',
        to: 'tester@localhost',
        muc: {
            type: 'info'
        }
    };

    client.on('muc:error', msg => {
        expect(msg).toStrictEqual(incoming);
    });

    client.emit('presence', incoming);
});

test('MUC leave', () => {
    const client = createClient({});
    client.joinedRooms.set('room@rooms.test', { nick: 'self' });

    const incoming: ReceivedPresence = {
        from: 'room@rooms.test/self',
        type: 'unavailable',
        to: 'tester@localhost',
        muc: {
            type: 'info',
            statusCodes: ['110']
        }
    };

    client.on('muc:leave', msg => {
        expect(msg).toStrictEqual(incoming);
    });

    client.emit('presence', incoming);
});

test('MUC destroyed', () => {
    const client = createClient({});
    client.joinedRooms.set('room@rooms.test', { nick: 'self' });

    const incoming: ReceivedPresence = {
        from: 'room@rooms.test/self',
        type: 'unavailable',
        to: 'tester@localhost',
        muc: {
            type: 'info',
            statusCodes: ['110'],
            destroy: {
                reason: 'done here',
                jid: 'new-room@rooms.test',
                password: 'secret'
            }
        }
    };

    client.on('muc:leave', msg => {
        expect(msg).toStrictEqual(incoming);
    });
    client.on('muc:destroyed', msg => {
        expect(msg).toStrictEqual({
            newRoom: 'new-room@rooms.test',
            password: 'secret',
            reason: 'done here',
            room: 'room@rooms.test'
        });
    });

    client.emit('presence', incoming);
});
