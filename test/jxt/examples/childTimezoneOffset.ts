import expect from 'expect';

import { childTimezoneOffset, parse, Registry } from '../../../src/jxt';

interface Example {
    tzo?: number | string;
}

const registry = new Registry();
registry.define({
    element: 'x',
    fields: {
        tzo: childTimezoneOffset(null, 'tzo')
    },
    namespace: '',
    path: 'example'
});

test('[Type: childTimezoneOffset] Basic import', () => {
    const xml = parse(`
            <x>
              <tzo>-05:00</tzo>
            </x>`);

    const ex = registry.import(xml) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({
        tzo: 300
    });
});

test('[Type: childTimezoneOffset] Basic import positive', () => {
    const xml = parse(`
            <x>
              <tzo>+05:00</tzo>
            </x>`);

    const ex = registry.import(xml) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({
        tzo: -300
    });
});

test('[Type: childTimezoneOffset] Basic export negative', () => {
    const data: Example = {
        tzo: -480
    };

    const ex = registry.export('example', data);
    expect(ex).toBeTruthy();

    const reimported = registry.import(ex!) as Example;
    expect(data).toEqual(reimported);
});

test('[Type: childTimezoneOffset] Basic export positive', () => {
    const data: Example = {
        tzo: 480
    };

    const ex = registry.export('example', data);
    expect(ex).toBeTruthy();

    const reimported = registry.import(ex!) as Example;
    expect(data).toEqual(reimported);
});

test('[Type: childTimezoneOffset] Export string', () => {
    const data: Example = {
        tzo: '-09:00'
    };

    const ex = registry.export('example', data);
    expect(ex).toBeTruthy();

    const reimported = registry.import(ex!) as Example;
    expect(reimported.tzo).toEqual(540);
});
