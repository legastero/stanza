import expect from 'expect';

import * as JXT from '../../src/jxt';

const attribute = JXT.attribute;

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
    description?: {
        descType: string;
        a?: string;
        b?: string;
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

test('[Export] Basic', () => {
    const registry = setupRegistry();
    const output = registry.export('message', {
        id: '123',
        type: 'normal'
    } as Message)!;

    const msg = registry.import(output) as Message;
    expect(msg.type).toBe('normal');
    expect(msg.id).toBe('123');
});

test('[Export] Extension', () => {
    const registry = setupRegistry();

    registry.define({
        aliases: ['message.foo', 'presence.foo2'],
        element: 'foo',
        fields: {
            a: attribute('a')
        },
        namespace: 'bar'
    });

    const msgOutput = registry.export('message', {
        foo: {
            a: 'test'
        },
        id: '123',
        type: 'normal'
    } as Message)!;

    const msg = registry.import(msgOutput) as Message;
    expect(msg.type).toBe('normal');
    expect(msg.id).toBe('123');
    expect(msg.foo!.a).toBe('test');

    const presenceOutput = registry.export('presence', {
        foo2: {
            a: 'test'
        },
        id: '123'
    } as Presence)!;

    const pres = registry.import(presenceOutput) as Presence;
    expect(pres.id).toBe('123');
    expect(pres.foo2.a).toBe('test');
});

test('[Export] Nested Extensions', () => {
    const registry = setupRegistry();

    registry.define({
        aliases: ['message.foo', 'presence.foo2'],
        element: 'foo',
        fields: {
            a: attribute('a')
        },
        namespace: 'bar'
    });

    registry.define({
        element: 'x',
        fields: {
            b: attribute('b')
        },
        namespace: 'bar',
        path: 'x'
    });

    registry.alias('bar', 'x', 'message.foo.x');

    const msgOutput = registry.export('message', {
        foo: {
            a: 'test',
            x: {
                b: 'nested'
            }
        },
        id: '123',
        type: 'normal'
    } as Message)!;

    const msg = registry.import(msgOutput) as Message;
    expect(msg.type).toBe('normal');
    expect(msg.id).toBe('123');
    expect(msg.foo!.a).toBe('test');
    expect(msg.foo!.x!.b).toBe('nested');
});

test('[Export] Multiples', () => {
    const registry = setupRegistry();

    registry.define({
        aliases: [{ path: 'message.multi', multiple: true }],
        element: 'multi',
        fields: {
            c: attribute('c')
        },
        namespace: 'foo'
    });

    const msgOutput = registry.export('message', {
        id: '123',
        multi: [{ c: '1' }, { c: '2' }, { c: '3' }],
        type: 'normal'
    } as Message)!;

    const msg = registry.import(msgOutput) as Message;
    expect(msg.type).toBe('normal');
    expect(msg.id).toBe('123');
    expect(msg.multi).toBeTruthy();
    expect(msg.multi!.length).toBe(3);
    expect(msg.multi![0].c).toBe('1');
    expect(msg.multi![1].c).toBe('2');
    expect(msg.multi![2].c).toBe('3');
});

test('[Export] Polymorphic', () => {
    const registry = setupRegistry();

    registry.define({
        aliases: ['presence.description'],
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
        aliases: ['presence.description'],
        element: 'description',
        fields: {
            b: attribute('b')
        },
        namespace: 'bar',
        path: 'message.description',
        type: 'bar',
        typeField: 'descType'
    });

    const msg1Output = registry.export('presence', {
        description: {
            a: 'test',
            descType: 'foo'
        },
        id: '123',
        type: 'normal'
    } as Message)!;

    const msg1 = registry.import(msg1Output) as Message;
    expect(msg1.description!.descType).toBe('foo');
    expect(msg1.description!.a).toBe('test');

    const msg2Output = registry.export('presence', {
        description: {
            b: 'test2',
            descType: 'bar'
        },
        id: '123',
        type: 'normal'
    } as Message)!;

    const msg2 = registry.import(msg2Output) as Message;
    expect(msg2.description!.descType).toBe('bar');
    expect(msg2.description!.b).toBe('test2');
});
