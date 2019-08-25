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
