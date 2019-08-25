import expect from 'expect';

import { booleanAttribute, parse, Registry } from '../../../src/jxt';

interface Example {
    foo?: boolean;
}

const registry = new Registry();
registry.define({
    element: 'x',
    fields: {
        foo: booleanAttribute('foo')
    },
    namespace: '',
    path: 'example'
});

test('[Type: booleanAttribute]: Import with "true"', () => {
    const ex = registry.import(parse('<x foo="true" />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex.foo).toBe(true);
});

test('[Type: booleanAttribute]: Import with "1"', () => {
    const ex = registry.import(parse('<x foo="1" />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex.foo).toBe(true);
});

test('[Type: booleanAttribute]: Import with "false"', () => {
    const ex = registry.import(parse('<x foo="false" />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex.foo).toBe(false);
});

test('[Type: booleanAttribute]: Import with "0"', () => {
    const ex = registry.import(parse('<x foo="0" />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex.foo).toBe(false);
});

test('[Type: booleanAttribute]: Import with anything not "true" or "1"', () => {
    const ex = registry.import(parse('<x foo="blah" />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex.foo).toBe(undefined);
});

test('[Type: booleanAttribute]: Export true', () => {
    const ex = registry.export<Example>('example', { foo: true });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x foo="1"/>');
});

test('[Type: booleanAttribute]: Export false', () => {
    const ex = registry.export<Example>('example', { foo: false });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x foo="0"/>');
});

test('[Type: booleanAttribute]: Export not set', () => {
    const ex = registry.import(parse('<x />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex!.foo).toBe(undefined);
});

test('[Type: booleanAttribute]', () => {
    const ex = registry.export<Example>('example', {});
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x/>');
});
