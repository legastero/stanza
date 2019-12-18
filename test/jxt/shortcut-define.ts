import expect from 'expect';

import * as JXT from '../../src/jxt';

interface Message {
    id?: string;
    body?: string;
}

const def = JXT.define({
    element: 'message',
    fields: {
        id: JXT.attribute('id')
    },
    namespace: 'jabber:client',
    path: 'message'
});

const multiPlugin = JXT.define([
    (reg: JXT.Registry) => {
        reg.define({
            element: 'message',
            fields: {
                id: JXT.attribute('id')
            },
            namespace: 'jabber:client',
            path: 'message'
        });
    },
    {
        element: 'message',
        fields: {
            body: JXT.childText(null, 'body')
        },
        namespace: 'jabber:client',
        path: 'message'
    }
]);

test('Shortcut define single', () => {
    const registry = new JXT.Registry();
    registry.define(def);

    const data: Message = registry.import(
        JXT.parse(`
        <message xmlns="jabber:client" id="test" />
    `)
    )! as Message;

    expect(data.id).toBe('test');
});

test('Shortcut define plugin functions', () => {
    const registry = new JXT.Registry();
    registry.define(multiPlugin);

    const data: Message = registry.import(
        JXT.parse(`
        <message xmlns="jabber:client" id="test">
          <body>testbody</body>
        </message>
    `)
    )! as Message;

    expect(data.id).toBe('test');
    expect(data.body).toBe('testbody');
});
