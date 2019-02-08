import * as tape from 'tape';

import * as JXT from '../../src/jxt';

const test = tape.test;
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

export default function runTests() {
    test('[Export] Basic', t => {
        const registry = setupRegistry();
        const output = registry.export('message', {
            id: '123',
            type: 'normal'
        } as Message)!;

        const msg = registry.import(output) as Message;
        t.equal(msg.type, 'normal', 'Message type is "normal"');
        t.equal(msg.id, '123', 'Message id is "123"');
        t.end();
    });

    test('[Export] Extension', t => {
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
        t.equal(msg.type, 'normal', 'Message type is "normal"');
        t.equal(msg.id, '123', 'Message id is "123"');
        t.equal(msg.foo!.a, 'test', 'Message foo.a is "test"');

        const presenceOutput = registry.export('presence', {
            foo2: {
                a: 'test'
            },
            id: '123'
        } as Presence)!;

        const pres = registry.import(presenceOutput) as Presence;
        t.equal(pres.id, '123', 'Presence id is "123"');
        t.equal(pres.foo2.a, 'test', 'Presence foo2.a is "test"');

        t.end();
    });

    test('[Export] Nested Extensions', t => {
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
        t.equal(msg.type, 'normal', 'Message type is "normal"');
        t.equal(msg.id, '123', 'Message id is "123"');
        t.equal(msg.foo!.a, 'test', 'Message foo.a is "test"');
        t.equal(msg.foo!.x!.b, 'nested', 'Message foo.x.b is "nested"');

        t.end();
    });

    test('[Export] Multiples', t => {
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
        t.equal(msg.type, 'normal', 'Message type is "normal"');
        t.equal(msg.id, '123', 'Message id is "123"');
        t.ok(msg.multi, 'Message multi exists');
        t.equal(msg.multi!.length, 3, 'Message multi length is 3');
        t.equal(msg.multi![0].c, '1', 'Message multi[0].c is "1"');
        t.equal(msg.multi![1].c, '2', 'Message multi[0].c is "2"');
        t.equal(msg.multi![2].c, '3', 'Message multi[0].c is "3"');

        t.end();
    });

    test('[Export] Polymorphic', t => {
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
        t.equal(msg1.description!.descType, 'foo', 'Message description.descType is "foo"');
        t.equal(msg1.description!.a, 'test', 'Message description.a is "test"');

        const msg2Output = registry.export('presence', {
            description: {
                b: 'test2',
                descType: 'bar'
            },
            id: '123',
            type: 'normal'
        } as Message)!;

        const msg2 = registry.import(msg2Output) as Message;
        t.equal(msg2.description!.descType, 'bar', 'Message description.descType is "bar"');
        t.equal(msg2.description!.b, 'test2', 'Message description.b is "test2"');

        t.end();
    });
}
