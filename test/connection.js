import test from 'tape';
import * as stanza from '../src';

test('Connect using WebSocket', function(t) {
    t.plan(1);

    const client = stanza.createClient({
        jid: 'anon@anon.lance.im',
        transport: 'websocket',
        wsURL: 'wss://anon.lance.im/xmpp-websocket'
    });

    client.on('session:started', function() {
        t.pass('Connected with WebSocket');
        client.disconnect();
    });

    client.connect();
});

/*
test('Connect using BOSH', function(t) {
    t.plan(1);

    const client = stanza.createClient({
        boshURL: 'https://anon.lance.im/http-bind',
        jid: 'anon@anon.lance.im',
        transport: 'bosh'
    });

    client.on('session:started', function() {
        t.pass('Connected with BOSH');
        client.disconnect();
    });

    client.connect();
});
*/
