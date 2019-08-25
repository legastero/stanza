import expect from 'expect';

import { childAlternateLanguageText, LanguageSet, parse, Registry } from '../../../src/jxt';

interface Example {
    foo?: LanguageSet<string>;
}

const registry = new Registry();
registry.define({
    element: 'x',
    fields: {
        foo: childAlternateLanguageText(null, 'foo')
    },
    namespace: '',
    path: 'example'
});

test('[Type: childAlternateLanguageText] Basic import', () => {
    const xml = parse(`
            <x xml:lang="sv">
              <foo xml:lang="no">Hallo verden</foo>
              <foo xml:lang="en-US">Hello world, from the US</foo>
              <foo xml:lang="en">Hello world</foo>
              <foo xml:lang="en-CA">Hello world, from Canada</foo>
              <foo>Hej världen</foo>
              <foo xml:lang="es">Hola mundo</foo>
              <foo xml:lang="de">Hallo Welt</foo>
            </x>`);

    const ex = registry.import(xml) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({
        foo: [
            { lang: 'no', value: 'Hallo verden' },
            { lang: 'en-us', value: 'Hello world, from the US' },
            { lang: 'en', value: 'Hello world' },
            { lang: 'en-ca', value: 'Hello world, from Canada' },
            { lang: 'sv', value: 'Hej världen' },
            { lang: 'es', value: 'Hola mundo' },
            { lang: 'de', value: 'Hallo Welt' }
        ]
    });
});

test('[Type: childAlternateLanguageText] Basic export', () => {
    const data: Example = {
        foo: [
            { lang: 'no', value: 'Hallo verden' },
            { lang: 'en-us', value: 'Hello world, from the US' },
            { lang: 'en', value: 'Hello world' },
            { lang: 'en-ca', value: 'Hello world, from Canada' },
            { lang: 'sv', value: 'Hej världen' },
            { lang: 'es', value: 'Hola mundo' },
            { lang: 'de', value: 'Hallo Welt' }
        ]
    };

    const ex = registry.export('example', data);
    expect(ex).toBeTruthy();

    const reimported = registry.import(ex!) as Example;
    expect(data).toEqual(reimported);
});
