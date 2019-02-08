import * as tape from 'tape';

import { childAlternateLanguageText, LanguageSet, parse, Registry } from '../../../src/jxt';

const test = tape.test;

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

export default function runTests() {
    test('[Type: childAlternateLanguageText] Basic import', t => {
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
        t.ok(ex, 'Imported version exists');
        t.deepEqual(
            ex,
            {
                foo: [
                    { lang: 'no', value: 'Hallo verden' },
                    { lang: 'en-us', value: 'Hello world, from the US' },
                    { lang: 'en', value: 'Hello world' },
                    { lang: 'en-ca', value: 'Hello world, from Canada' },
                    { lang: 'sv', value: 'Hej världen' },
                    { lang: 'es', value: 'Hola mundo' },
                    { lang: 'de', value: 'Hallo Welt' }
                ]
            },
            'Imported JSON matches'
        );
        t.end();
    });

    test('[Type: childAlternateLanguageText] Basic export', t => {
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
        t.ok(ex, 'Exported version exists');

        const reimported = registry.import(ex!) as Example;
        t.deepEqual(data, reimported, 'Reimported XML matches');
        t.end();
    });
}
