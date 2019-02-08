import * as tape from 'tape';

import {
    childAlternateLanguageRawElement,
    JSONElement,
    LanguageSet,
    parse,
    Registry,
    XMLElement
} from '../../../src/jxt';

const test = tape.test;

interface Example {
    foo?: LanguageSet<JSONElement | string>;
}

const registry = new Registry();
registry.define([
    {
        element: 'x',
        fields: {
            foo: childAlternateLanguageRawElement(null, 'foo')
        },
        namespace: '',
        path: 'example'
    },
    {
        element: 'x2',
        fields: {
            foo: childAlternateLanguageRawElement(null, 'foo', 'removeBad')
        },
        namespace: '',
        path: 'example2'
    }
]);

function removeBad(input: JSONElement | string): JSONElement | string | undefined {
    if (!input) {
        return;
    }
    if (typeof input === 'string') {
        return input;
    }
    if (input.name === 'bad') {
        return undefined;
    }
    input.children = input.children.map(removeBad).filter(c => !!c) as Array<JSONElement | string>;
    return input;
}

export default function runTests() {
    test('[Type: childAlternateLanguageRawElement] Basic import', t => {
        const ex = registry.import(parse('<x><foo /></x>')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(
            ex,
            { foo: [{ lang: '', value: new XMLElement('foo').toJSON() }] },
            'Imported JSON matches'
        );
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Basic export', t => {
        const ex = registry.export<Example>('example', {
            foo: [{ lang: '', value: new XMLElement('foo').toJSON() }]
        });
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x><foo/></x>', 'Exported XML matches');
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Basic import, no children', t => {
        const ex = registry.import(parse('<x />')) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, {}, 'Imported JSON matches');
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Basic export, no children', t => {
        const ex = registry.export<Example>('example', { foo: [] });
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x/>', 'Exported XML matches');
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Export, with a string as child', t => {
        const ex = registry.export<Example>('example', { foo: [{ lang: 'en', value: 'test' }] });
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x><foo xml:lang="en">test</foo></x>', 'Exported XML matches');
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Basic import, multiple languages', t => {
        const ex = registry.import(
            parse(`
          <x>
            <foo xml:lang="en" />
            <foo xml:lang="no" />
          </x>
        `)
        ) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(
            ex,
            {
                foo: [
                    { lang: 'en', value: new XMLElement('foo', { 'xml:lang': 'en' }).toJSON() },
                    { lang: 'no', value: new XMLElement('foo', { 'xml:lang': 'no' }).toJSON() }
                ]
            },
            'Imported JSON matches'
        );
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Basic export, multiple languages', t => {
        const ex = registry.export<Example>('example', {
            foo: [
                { lang: 'en', value: new XMLElement('foo', { 'xml:lang': 'en' }).toJSON() },
                { lang: 'no', value: new XMLElement('foo', { 'xml:lang': 'no' }).toJSON() }
            ]
        });
        t.ok(ex, 'Exported version exists');
        t.equal(
            ex!.toString(),
            '<x><foo xml:lang="en"/><foo xml:lang="no"/></x>',
            'Exported XML matches'
        );
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Basic import, multiple languages, with default lang', t => {
        const ex = registry.import(
            parse(`
          <x xml:lang="en">
            <foo />
            <foo xml:lang="no" />
          </x>
        `)
        ) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(
            ex,
            {
                foo: [
                    { lang: 'en', value: new XMLElement('foo').toJSON() },
                    { lang: 'no', value: new XMLElement('foo', { 'xml:lang': 'no' }).toJSON() }
                ]
            },
            'Imported JSON matches'
        );
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Export with duplicate language', t => {
        const ex = registry.export<Example>(
            'example',
            {
                foo: [{ lang: 'en', value: 'test en' }, { lang: 'no', value: 'test no' }]
            },
            {
                lang: 'en'
            }
        );
        t.ok(ex, 'Exported version exists');
        t.equal(
            ex!.toString(),
            '<x><foo>test en</foo><foo xml:lang="no">test no</foo></x>',
            'Exported XML matches'
        );
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Import with sanitizer', t => {
        const ex = registry.import(parse('<x2><foo><bad/><good/></foo></x2>'), {
            sanitizers: {
                removeBad
            }
        }) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(
            ex,
            {
                foo: [
                    {
                        lang: '',
                        value: {
                            attributes: {},
                            children: [
                                {
                                    attributes: {},
                                    children: [],
                                    name: 'good'
                                }
                            ],
                            name: 'foo'
                        }
                    }
                ]
            },
            'Imported JSON matches'
        );
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Export with sanitizer', t => {
        const ex = registry.export<Example>(
            'example2',
            {
                foo: [
                    {
                        lang: '',
                        value: {
                            attributes: {},
                            children: [
                                {
                                    attributes: {},
                                    children: [
                                        {
                                            attributes: {},
                                            children: [],
                                            name: 'bad'
                                        }
                                    ],
                                    name: 'good'
                                }
                            ],
                            name: 'foo'
                        }
                    }
                ]
            },
            {
                sanitizers: {
                    removeBad
                }
            }
        );
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x2><foo><good/></foo></x2>', 'Exported XML matches');
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Import with missing sanitizer', t => {
        const ex = registry.import(parse('<x2><foo><good/></foo></x2>'), {
            sanitizers: {}
        }) as Example;
        t.ok(ex, 'Imported version exists');
        t.deepEqual(ex, {}, 'Imported JSON matches');
        t.end();
    });

    test('[Type: childAlternateLanguageRawElement] Export with missing sanitizer', t => {
        const ex = registry.export(
            'example2',
            {
                foo: [
                    {
                        lang: '',
                        value: {
                            attributes: {},
                            children: [
                                {
                                    attributes: {},
                                    children: [],
                                    name: 'good'
                                }
                            ],
                            name: 'foo'
                        }
                    }
                ]
            } as Example,
            {
                sanitizers: {}
            }
        );
        t.ok(ex, 'Exported version exists');
        t.equal(ex!.toString(), '<x2/>', 'Exported XML matches');
        t.end();
    });
}
