import test from 'tape';

import * as JXT from '../../src/jxt';

interface Message {
    id?: string;
    body?: string;
}

function setup(): JXT.Registry {
    const registry = new JXT.Registry();

    registry.define({
        element: 'message',
        fields: {
            id: JXT.attribute('id')
        },
        namespace: 'jabber:client',
        path: 'message'
    });

    return registry;
}

export default function runTests() {
    test('[Re-open] Re-open existing defintion with additional fields', t => {
        const registry = setup();

        registry.define({
            element: 'message',
            fields: {
                body: JXT.childText(null, 'body')
            },
            namespace: 'jabber:client'
        });

        const msgXML = JXT.parse(`
            <message xmlns="jabber:client" id="test">
              <body>beep</body>
            </message>
        `);
        const msg = registry.import(msgXML) as Message;

        t.ok(msg.id, 'message.id exists');
        t.equal(msg.id, 'test', 'message.id is "test"');
        t.ok(msg.body, 'message.body exists');
        t.equal(msg.body, 'beep', 'message.body is "beep"');
        t.end();
    });

    test('[Re-open] Re-open existing defintion with additional aliases/path', t => {
        const registry = setup();

        registry.define({
            aliases: ['message.forwarded'],
            element: 'forwarded',
            namespace: 'urn:xmpp:forward:0',
            path: 'forward'
        });

        registry.define({
            element: 'message',
            fields: {
                body: JXT.childText(null, 'body')
            },
            namespace: 'jabber:client',
            path: 'forward.message'
        });

        const msgXML = JXT.parse(`
            <message xmlns="jabber:client" id="test">
              <body>beep</body>
            </message>
        `);
        const msg = registry.import(msgXML) as Message;

        t.ok(msg.id, 'message.id exists');
        t.equal(msg.id, 'test', 'message.id is "test"');
        t.ok(msg.body, 'message.body exists');
        t.equal(msg.body, 'beep', 'message.body is "beep"');

        const msg2XML = JXT.parse(`
            <message xmlns="jabber:client" id="outer">
              <body>outer beep</body>
              <forwarded xmlns="urn:xmpp:forward:0">
                <message xmlns="jabber:client" id="test">
                 <body>beep</body>
                </message>
              </forwarded>
            </message>
        `);
        const msg2 = registry.import(msg2XML) as any;

        t.ok(msg2.id, 'id exists');
        t.equal(msg2.id, 'outer', 'id is "outer"');
        t.ok(msg2.body, 'body exists');
        t.equal(msg2.body, 'outer beep', 'body is "outer beep"');
        t.ok(msg2.forwarded.message.id, 'forwarded.message.id exists');
        t.equal(msg2.forwarded.message.id, 'test', 'forwarded.message.id is "test"');
        t.ok(msg2.forwarded.message.body, 'forwarded.message.body exists');
        t.equal(msg2.forwarded.message.body, 'beep', 'forwarded.message.body is "beep"');
        t.end();
    });
}
