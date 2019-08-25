import expect from 'expect';

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

test('[Type: namespacedAttribute] Basic import', () => {
    const ex = registry.import(parse('<x xmlns:p="ns" p:foo="bar" />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({ foo: 'bar' });
});

test('[Type: namespacedAttribute] Basic export', () => {
    const ex = registry.export<Example>('example', { foo: 'bar' });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x xmlns:p="ns" p:foo="bar"/>');
});

test('[Type: namespacedAttribute] Parent defined namespace import', () => {
    const ex = registry.import(parse('<x3 xmlns:p="ns"><c p:foo="bar" /></x3>')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({ child: { foo: 'bar' } });
});

test('[Type: namespacedAttribute] Parent defined namespace export', () => {
    const ex = registry.export<Example>('example3', { baz: 'qux', child: { foo: 'bar' } });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x3 xmlns:other="ns" other:baz="qux"><c other:foo="bar"/></x3>');
});

test('[Type: namespacedAttribute] Empty import', () => {
    const ex = registry.import(parse('<x />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({});
});

test('[Type: namespacedAttribute] Empty export', () => {
    const ex = registry.export<Example>('example', {});
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x/>');
});

test('[Type: namespacedAttribute] Default value import', () => {
    const ex = registry.import(parse('<x2 />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({ foo: 'bar' });
});
