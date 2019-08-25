import expect from 'expect';

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

test('[Re-open] Re-open existing defintion with additional fields', () => {
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

    expect(msg.id).toBeTruthy();
    expect(msg.id).toBe('test');
    expect(msg.body).toBeTruthy();
    expect(msg.body).toBe('beep');
});

test('[Re-open] Re-open existing defintion with additional aliases/path', () => {
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

    expect(msg.id).toBeTruthy();
    expect(msg.id).toBe('test');
    expect(msg.body).toBeTruthy();
    expect(msg.body).toBe('beep');

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

    expect(msg2.id).toBeTruthy();
    expect(msg2.id).toBe('outer');
    expect(msg2.body).toBeTruthy();
    expect(msg2.body).toBe('outer beep');
    expect(msg2.forwarded.message.id).toBeTruthy();
    expect(msg2.forwarded.message.id).toBe('test');
    expect(msg2.forwarded.message.body).toBeTruthy();
    expect(msg2.forwarded.message.body).toBe('beep');
});
