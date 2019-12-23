import expect from 'expect';
import * as stanza from '../src';

test('Connect using WebSocket', done => {
    expect.assertions(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            websocket: 'wss://anon.stanzajs.org/xmpp-websocket'
        }
    });

    client.on('session:started', () => {
        client.disconnect();
        expect(true).toBe(true);
        done();
    });

    client.connect();
});

test('Connect using BOSH', done => {
    expect.assertions(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            bosh: 'https://anon.stanzajs.org/http-bind'
        }
    });

    client.on('session:started', () => {
        client.disconnect();
        expect(true).toBe(true);
        done();
    });

    client.connect();
});

test('End to end', done => {
    expect.assertions(2);

    const client1 = stanza.createClient({
        jid: 'anon@anon.stanzajs.org'
    });
    const client2 = stanza.createClient({
        jid: 'anon@anon.stanzajs.org'
    });

    client1.on('session:started', async () => {
        const roster = await client1.getRoster();
        expect(roster.items).toStrictEqual([]);
        client1.sendPresence();

        client2.on('session:started', async () => {
            await client2.getRoster();
            client2.sendPresence();
            client2.subscribe(client1.jid);
        });
        client2.connect();
    });

    client1.on('available', async pres => {
        if (pres.from === client1.jid) {
            return;
        }
        await client1.ping(pres.from);

        client1.sendMessage({
            to: client2.jid,
            body: 'test'
        });
    });

    client1.on('subscribe', () => {
        client1.acceptSubscription(client2.jid);
        client1.subscribe(client2.jid);
    });

    client2.on('subscribe', () => {
        client2.acceptSubscription(client1.jid);
    });

    client2.on('message', msg => {
        expect(msg.body).toBe('test');

        client1.disconnect();
        client2.disconnect();

        done();
    });

    client1.connect();
});
