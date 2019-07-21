import test from 'tape';
import * as stanza from '../src';

test('Connect using WebSocket', t => {
    t.plan(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            websocket: 'wss://anon.stanzajs.org/xmpp-websocket'
        }
    });

    client.on('session:started', () => {
        t.pass('Connected with WebSocket');
        client.disconnect();
    });

    client.connect();
});

test('Connect using BOSH', t => {
    t.plan(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            bosh: 'https://anon.stanzajs.org/http-bind'
        }
    });

    client.on('session:started', () => {
        t.pass('Connected with BOSH');
        client.disconnect();
    });

    client.connect();
});
