import test from 'tape';

import * as JXT from '../../src/jxt';

const attribute = JXT.attribute;

interface Message {
    foo?: {
        a: string;
    };
    bar?: Array<{
        b: string;
    }>;
    baz?: {
        c: string;
    };
}

export default function runTests() {
    test('[Forward Refs] Reference items before defining', t => {
        const registry = new JXT.Registry();

        registry.define({
            element: 'foo',
            fields: {
                a: attribute('a')
            },
            namespace: 'test',
            path: 'message.foo'
        });

        registry.define({
            aliases: [{ path: 'message.bar', multiple: true }],
            element: 'bar',
            fields: {
                b: attribute('b')
            },
            namespace: 'test'
        });

        registry.define({
            aliases: ['message.baz'],
            element: 'baz',
            fields: {
                c: attribute('c')
            },
            namespace: 'test'
        });

        registry.define({
            element: 'message',
            namespace: 'jabber:client',
            path: 'message'
        });

        const msgXML = registry.export('message', {
            bar: [{ b: '1' }, { b: '2' }],
            baz: { c: 'test2' },
            foo: { a: 'test' }
        })!;
        const msg = registry.import(msgXML) as Message;

        t.ok(msg.foo, 'message.foo exists');
        t.equal(msg.foo!.a, 'test', 'message.foo.a is "test"');
        t.ok(msg.bar, 'message.bar exists');
        t.equal(msg.bar!.length, 2, 'message.bar has correct length');
        t.ok(msg.baz, 'message.baz exists');
        t.equal(msg.baz!.c, 'test2', 'message.baz.c is "test2"');
        t.end();
    });

    test('[Forward Refs] Reference alias multi-path items before defining', t => {
        const registry = new JXT.Registry();

        registry.define({
            aliases: [{ path: 'message.bar', multiple: true }],
            element: 'bar',
            fields: {
                b: attribute('b')
            },
            namespace: 'test'
        });

        registry.define({
            element: 'message',
            namespace: 'jabber:client',
            path: 'message'
        });

        const msgXML = registry.export('message', {
            bar: [{ b: '1' }, { b: '2' }]
        })!;
        const msg = registry.import(msgXML) as Message;

        t.ok(msg.bar, 'message.bar exists');
        t.equal(msg.bar!.length, 2, 'message.bar has correct length');
        t.end();
    });

    test('[Forward Refs] Reference alias path before defining', t => {
        const registry = new JXT.Registry();

        registry.define({
            aliases: ['message.baz'],
            element: 'baz',
            fields: {
                c: attribute('c')
            },
            namespace: 'test'
        });

        registry.define({
            element: 'message',
            namespace: 'jabber:client',
            path: 'message'
        });

        const msgXML = registry.export('message', {
            baz: { c: 'test2' }
        })!;
        const msg = registry.import(msgXML) as Message;

        t.ok(msg.baz, 'message.baz exists');
        t.equal(msg.baz!.c, 'test2', 'message.baz.c is "test2"');
        t.end();
    });
}
