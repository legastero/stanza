import test from 'tape';

import { namespacedAttribute, parse, Registry } from '../../../src/jxt';

interface Example {
    foo?: string;
    baz?: string;
    child?: {
        foo?: string;
    };
}

const registry = new Registry();
registry.define([
    {
        element: 'x',
        fields: {
            foo: namespacedAttribute('p', 'ns', 'foo')
        },
        namespace: '',
        path: 'example'
    },
    {
        element: 'x2',
        fields: {
            foo: namespacedAttribute('p', 'ns', 'foo', 'bar')
        },
        namespace: '',
        path: 'example2'
    },
    {
        element: 'x3',
        fields: {
            baz: namespacedAttribute('p', 'ns', 'baz')
        },
        namespace: '',
        optionalNamespaces: {
            other: 'ns'
        },
        path: 'example3'
    },
    {
        element: 'c',
        fields: {
            foo: namespacedAttribute('p', 'ns', 'foo')
        },
        namespace: '',
        path: 'example3.child'
    }
]);

export default function runTests() {
    test('[Type: namespacedAttribute] Basic import', t => {
        const ex = registry.import(parse('<x xmlns:p="ns" p:foo="bar" />')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, { foo: 'bar' }, 'Attribute equals "bar"');
        t.end();
    });

    test('[Type: namespacedAttribute] Basic export', t => {
        const ex = registry.export<Example>('example', { foo: 'bar' });
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x xmlns:p="ns" p:foo="bar"/>', 'Exported XML matches');
        t.end();
    });

    test('[Type: namespacedAttribute] Parent defined namespace import', t => {
        const ex = registry.import(parse('<x3 xmlns:p="ns"><c p:foo="bar" /></x3>')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, { child: { foo: 'bar' } }, 'Attribute equals "bar"');
        t.end();
    });

    test('[Type: namespacedAttribute] Parent defined namespace export', t => {
        const ex = registry.export<Example>('example3', { baz: 'qux', child: { foo: 'bar' } });
        t.ok(ex, 'Exported version exists');
        t.equal(
            ex!.toString(),
            '<x3 xmlns:other="ns" other:baz="qux"><c other:foo="bar"/></x3>',
            'Exported XML matches'
        );
        t.end();
    });

    test('[Type: namespacedAttribute] Empty import', t => {
        const ex = registry.import(parse('<x />')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, {}, 'Attribute value not present');
        t.end();
    });

    test('[Type: namespacedAttribute] Empty export', t => {
        const ex = registry.export<Example>('example', {});
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x/>', 'Exported XML matches');
        t.end();
    });

    test('[Type: namespacedAttribute] Default value import', t => {
        const ex = registry.import(parse('<x2 />')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, { foo: 'bar' }, 'Attribute value has default value');
        t.end();
    });
}
