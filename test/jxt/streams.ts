import test from 'tape';
import { attribute, childText, ParsedData, Registry, StreamParser } from '../../src/jxt';

interface Message {
    type: string;
    id: string;
    body?: string;
}

function setupRegistry(): Registry {
    const registry = new Registry();

    registry.define({
        element: 'message',
        fields: {
            body: childText(null, 'body'),
            id: attribute('id'),
            type: attribute('type')
        },
        namespace: 'jabber:client',
        path: 'message'
    });

    registry.define({
        element: 'stream',
        namespace: 'http://etherx.jabber.org/streams',
        path: 'stream'
    });

    return registry;
}

export default function runTests() {
    test('[Streams] Unwrapped streams', t => {
        const registry = setupRegistry();
        const parser = new StreamParser({
            registry
        });

        parser.on('data', (data: ParsedData) => {
            t.equal(data.kind, 'message', 'Parsed data is a message');
            const msg = data.stanza as Message;
            t.equal(msg.body, 'test', 'Message body is "test"');
            t.end();
        });

        parser.write('<message xmlns="jabber:client" type="normal" id="123">');
        parser.write('<body>test</body>');
        parser.write('</message>');
    });

    test('[Streams] Wrapped streams', t => {
        t.plan(4);

        const registry = setupRegistry();
        const parser = new StreamParser({
            registry,
            rootKey: 'stream',
            wrappedStream: true
        });

        parser.on('data', (data: ParsedData) => {
            if (data.event === 'stream-start') {
                t.equal(data.kind, 'stream', 'Parsed data is stream opening');
            }
            if (data.event === 'stream-end') {
                t.equal(data.kind, 'stream', 'Parsed data is stream closing');
            }
            if (!data.event) {
                t.equal(data.kind, 'message', 'Parsed data is a message');
                const msg = data.stanza as Message;
                t.equal(msg.body, 'test', 'Message body is "test"');
            }
        });

        parser.write(
            '<stream:stream xmlns:stream="http://etherx.jabber.org/streams" xmlns="jabber:client">'
        );
        parser.write('<message type="normal" id="123">');
        parser.write('<body>test</body>');
        parser.write('</message>');
        parser.write('</stream:stream>');
    });
}
