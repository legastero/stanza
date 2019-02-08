import * as tape from 'tape';

import { attribute, parse, Registry } from '../../../src/jxt';

const test = tape.test;

interface Example {
    foo?: string;
}

const registry = new Registry();
registry.define([
    {
        element: 'x',
        fields: {
            foo: attribute('foo')
        },
        namespace: '',
        path: 'example'
    },
    {
        element: 'x2',
        fields: {
            foo: attribute('foo', 'bar')
        },
        namespace: '',
        path: 'example2'
    },
    {
        element: 'x3',
        fields: {
            foo: attribute('foo', undefined, true)
        },
        namespace: '',
        path: 'example3'
    }
]);

export default function runTests() {
    test('[Type: attribute] Basic import', t => {
        const ex = registry.import(parse('<x foo="bar" />')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, { foo: 'bar' }, 'Attribute equals "bar"');
        t.end();
    });

    test('[Type: attribute] Basic export', t => {
        const ex = registry.export<Example>('example', { foo: 'bar' });
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x foo="bar"/>', 'Exported XML matches');
        t.end();
    });

    test('[Type: attribute] Empty import', t => {
        const ex = registry.import(parse('<x />')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, {}, 'Attribute value not present');
        t.end();
    });

    test('[Type: attribute] Empty export', t => {
        const ex = registry.export<Example>('example', {});
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x/>', 'Exported XML matches');
        t.end();
    });

    test('[Type: attribute] Default value import', t => {
        const ex = registry.import(parse('<x2 />')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, { foo: 'bar' }, 'Attribute value has default value');
        t.end();
    });

    test('[Type: attribute] Emit when not allowing empty', t => {
        const ex = registry.export<Example>('example', { foo: '' });
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x/>', 'Exported XML matches');
        t.end();
    });

    test('[Type: attribute] Emit when allowing empty', t => {
        const ex = registry.export<Example>('example3', { foo: '' });
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x3 foo=""/>', 'Exported XML matches');
        t.end();
    });

    test('[Type: attribute] Import when not allowing empty', t => {
        const ex = registry.import(parse('<x foo=""/>')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, {}, 'Attribute is not present');
        t.end();
    });

    test('[Type: attribute] Import when allowing empty', t => {
        const ex = registry.import(parse('<x3 foo=""/>')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, { foo: '' }, 'Attribute value is empty string');
        t.end();
    });
}
