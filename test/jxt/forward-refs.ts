import expect from 'expect';

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

test('[Forward Refs] Reference items before defining', () => {
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

    expect(msg.foo).toBeTruthy();
    expect(msg.foo!.a).toBe('test');
    expect(msg.bar).toBeTruthy();
    expect(msg.bar!.length).toBe(2);
    expect(msg.baz).toBeTruthy();
    expect(msg.baz!.c).toBe('test2');
});

test('[Forward Refs] Reference alias multi-path items before defining', () => {
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

    expect(msg.bar).toBeTruthy();
    expect(msg.bar!.length).toBe(2);
});

test('[Forward Refs] Reference alias path before defining', () => {
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

    expect(msg.baz).toBeTruthy();
    expect(msg.baz!.c).toBe('test2');
});
