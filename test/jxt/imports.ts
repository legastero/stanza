import * as tape from 'tape';

import * as JXT from '../../src/jxt';

const test = tape.test;
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

export default function runTests() {
    test('[Import] Basic', t => {
        const registry = setupRegistry();

        const messageXML = parse(`
            <message xmlns="jabber:client" type="normal" id="123">
              <body>test body</body>
            </message>`);

        const msg = registry.import(messageXML) as Message;

        t.ok(msg, 'Message exists');
        t.equal(msg.type, 'normal', 'Message type is "normal"');
        t.equal(msg.id, '123', 'Message id is "123"');
        t.end();
    });

    test('[Import] Extension', t => {
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
        t.equal(msg.type, 'normal', 'Message type is "normal"');
        t.equal(msg.id, '123', 'Message id is "123"');
        t.equal(msg.foo!.a, 'test', 'Message foo.a is "test"');

        const presenceXML = parse(`
            <presence xmlns="jabber:client" id="123">
              <foo xmlns="bar" a="test" />
            </presence>`);

        const pres = registry.import(presenceXML) as Presence;
        t.equal(pres.id, '123', 'Presence id is "123"');
        t.equal(pres.foo2.a, 'test', 'Presence foo2.a is "test"');

        t.end();
    });

    test('[Import] Nested Extensions', t => {
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
        t.equal(msg.type, 'normal', 'Message type is "normal"');
        t.equal(msg.id, '123', 'Message id is "123"');
        t.equal(msg.foo!.a, 'test', 'Message foo.a is "test"');
        t.equal(msg.foo!.x!.b, 'nested', 'Message foo.x.b is "nested"');

        t.end();
    });

    test('[Import] Multiples', t => {
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
        t.equal(msg.type, 'normal', 'Message type is "normal"');
        t.equal(msg.id, '123', 'Message id is "123"');
        t.ok(msg.multi, 'Message multi exists');
        t.equal(msg.multi!.length, 3, 'Message multi length is 3');
        t.equal(msg.multi![0].c, '1', 'Message multi[0].c is "1"');
        t.equal(msg.multi![1].c, '2', 'Message multi[0].c is "2"');
        t.equal(msg.multi![2].c, '3', 'Message multi[0].c is "3"');

        t.end();
    });

    test('[Import] Polymorphic', t => {
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
        t.equal(msg1.description!.descType, 'foo', 'Message description.descType is "foo"');
        t.equal(msg1.description!.a, 'test', 'Message description.a is "test"');
        t.equal(msg1.description!.b, undefined, 'Message description.b does not exist');

        const message2XML = parse(`
            <message xmlns="jabber:client" type="normal" id="123">
              <body>test body</body>
              <description xmlns="bar" b="test2" />
            </message>`);

        const msg2 = registry.import(message2XML) as Message;
        t.equal(msg2.description!.descType, 'bar', 'Message description.descType is "bar"');
        t.equal(msg2.description!.b, 'test2', 'Message description.b is "test2"');
        t.equal(msg2.description!.a, undefined, 'Message description.a does not exist');

        t.end();
    });
}
