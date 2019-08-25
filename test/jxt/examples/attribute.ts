import expect from 'expect';

import { attribute, parse, Registry } from '../../../src/jxt';

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
            foo: attribute('foo', undefined, { emitEmpty: true })
        },
        namespace: '',
        path: 'example3'
    }
]);

test('[Type: attribute] Basic import', () => {
    const ex = registry.import(parse('<x foo="bar" />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({ foo: 'bar' });
});

test('[Type: attribute] Basic export', () => {
    const ex = registry.export<Example>('example', { foo: 'bar' });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x foo="bar"/>');
});

test('[Type: attribute] Empty import', () => {
    const ex = registry.import(parse('<x />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({});
});

test('[Type: attribute] Empty export', () => {
    const ex = registry.export<Example>('example', {});
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x/>');
});

test('[Type: attribute] Default value import', () => {
    const ex = registry.import(parse('<x2 />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({ foo: 'bar' });
});

test('[Type: attribute] Emit when not allowing empty', () => {
    const ex = registry.export<Example>('example', { foo: '' });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x/>');
});

test('[Type: attribute] Emit when allowing empty', () => {
    const ex = registry.export<Example>('example3', { foo: '' });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x3 foo=""/>');
});

test('[Type: attribute] Import when not allowing empty', () => {
    const ex = registry.import(parse('<x foo=""/>')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({});
});

test('[Type: attribute] Import when allowing empty', () => {
    const ex = registry.import(parse('<x3 foo=""/>')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({ foo: '' });
});
