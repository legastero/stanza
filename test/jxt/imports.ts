import expect from 'expect';

import * as JXT from '../../src/jxt';

const attribute = JXT.attribute;
const parse = JXT.parse;

interface Message {
    type: string;
    id: string;
    foo?: {
        a: string;
        x?: {
            b: string;
        };
    };
    description?: {
        descType: string;
        a?: string;
        b?: string;
    };
    multi?: Array<{ c: string }>;
}

interface Presence {
    id: string;
    type: string;
    foo2: {
        a: string;
    };
}

function setupRegistry(): JXT.Registry {
    const registry = new JXT.Registry();

    registry.define({
        element: 'message',
        fields: {
            id: attribute('id'),
            type: attribute('type')
        },
        namespace: 'jabber:client',
        path: 'message'
    });

    registry.define({
        element: 'presence',
        fields: {
            id: attribute('id'),
            type: attribute('type')
        },
        namespace: 'jabber:client',
        path: 'presence'
    });

    return registry;
}

test('[Import] Basic', () => {
    const registry = setupRegistry();

    const messageXML = parse(`
            <message xmlns="jabber:client" type="normal" id="123">
              <body>test body</body>
            </message>`);

    const msg = registry.import(messageXML) as Message;

    expect(msg).toBeTruthy();
    expect(msg.type).toBe('normal');
    expect(msg.id).toBe('123');
});

test('[Import] Extension', () => {
    const registry = setupRegistry();

    registry.define({
        aliases: ['message.foo', 'presence.foo2'],
        element: 'foo',
        fields: {
            a: attribute('a')
        },
        namespace: 'bar'
    });

    const messageXML = parse(`
            <message xmlns="jabber:client" type="normal" id="123">
              <body>test body</body>
              <foo xmlns="bar" a="test" />
            </message>`);

    const msg = registry.import(messageXML) as Message;
    expect(msg.type).toBe('normal');
    expect(msg.id).toBe('123');
    expect(msg.foo!.a).toBe('test');

    const presenceXML = parse(`
            <presence xmlns="jabber:client" id="123">
              <foo xmlns="bar" a="test" />
            </presence>`);

    const pres = registry.import(presenceXML) as Presence;
    expect(pres.id).toBe('123');
    expect(pres.foo2.a).toBe('test');
});

test('[Import] Nested Extensions', () => {
    const registry = setupRegistry();

    registry.define({
        element: 'foo',
        fields: {
            a: attribute('a')
        },
        namespace: 'bar',
        path: 'message.foo'
    });

    registry.define({
        element: 'x',
        fields: {
            b: attribute('b')
        },
        namespace: 'bar',
        path: 'message.foo.x'
    });

    const messageXML = parse(`
            <message xmlns="jabber:client" type="normal" id="123">
              <body>test body</body>
              <foo xmlns="bar" a="test">
                <x b="nested" />
              </foo>
            </message>`);

    const msg = registry.import(messageXML) as Message;
    expect(msg.type).toBe('normal');
    expect(msg.id).toBe('123');
    expect(msg.foo!.a).toBe('test');
    expect(msg.foo!.x!.b).toBe('nested');
});

test('[Import] Multiples', () => {
    const registry = setupRegistry();

    registry.define({
        aliases: [{ path: 'message.multi', multiple: true }],
        element: 'multi',
        fields: {
            c: attribute('c')
        },
        namespace: 'foo'
    });

    const messageXML = parse(`
            <message xmlns="jabber:client" type="normal" id="123">
              <body>test body</body>
              <multi xmlns="foo" c="1" />
              <multi xmlns="foo" c="2" />
              <multi xmlns="foo" c="3" />
            </message>`);

    const msg = registry.import(messageXML) as Message;
    expect(msg.type).toBe('normal');
    expect(msg.id).toBe('123');
    expect(msg.multi).toBeTruthy();
    expect(msg.multi!.length).toBe(3);
    expect(msg.multi![0].c).toBe('1');
    expect(msg.multi![1].c).toBe('2');
    expect(msg.multi![2].c).toBe('3');
});

test('[Import] Polymorphic', () => {
    const registry = setupRegistry();

    registry.define({
        element: 'description',
        fields: {
            a: attribute('a')
        },
        namespace: 'foo',
        path: 'message.description',
        type: 'foo',
        typeField: 'descType'
    });

    registry.define({
        element: 'description',
        fields: {
            b: attribute('b')
        },
        namespace: 'bar',
        path: 'message.description',
        type: 'bar',
        typeField: 'descType'
    });

    const message1XML = parse(`
            <message xmlns="jabber:client" type="normal" id="123">
              <body>test body</body>
              <description xmlns="foo" a="test" />
            </message>`);

    const msg1 = registry.import(message1XML) as Message;
    expect(msg1.description!.descType).toBe('foo');
    expect(msg1.description!.a).toBe('test');
    expect(msg1.description!.b).toBe(undefined);

    const message2XML = parse(`
            <message xmlns="jabber:client" type="normal" id="123">
              <body>test body</body>
              <description xmlns="bar" b="test2" />
            </message>`);

    const msg2 = registry.import(message2XML) as Message;
    expect(msg2.description!.descType).toBe('bar');
    expect(msg2.description!.b).toBe('test2');
    expect(msg2.description!.a).toBe(undefined);
});
