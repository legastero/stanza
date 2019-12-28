import expect from 'expect';

import {
    childAlternateLanguageRawElement,
    JSONElement,
    LanguageSet,
    parse,
    Registry,
    XMLElement
} from '../../../src/jxt';

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

test('[Type: childAlternateLanguageRawElement] Basic import', () => {
    const ex = registry.import(parse('<x><foo /></x>')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({ foo: [{ lang: '', value: new XMLElement('foo').toJSON() }] });
});

test('[Type: childAlternateLanguageRawElement] Basic export', () => {
    const ex = registry.export<Example>('example', {
        foo: [{ lang: '', value: new XMLElement('foo').toJSON() }]
    });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x><foo/></x>');
});

test('[Type: childAlternateLanguageRawElement] Basic import, no children', () => {
    const ex = registry.import(parse('<x />')) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({});
});

test('[Type: childAlternateLanguageRawElement] Basic export, no children', () => {
    const ex = registry.export<Example>('example', { foo: [] });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x/>');
});

test('[Type: childAlternateLanguageRawElement] Export, with a string as child', () => {
    const ex = registry.export<Example>('example', { foo: [{ lang: 'en', value: 'test' }] });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x><foo xml:lang="en">test</foo></x>');
});

test('[Type: childAlternateLanguageRawElement] Basic import, multiple languages', () => {
    const ex = registry.import(
        parse(`
          <x>
            <foo xml:lang="en" />
            <foo xml:lang="no" />
          </x>
        `)
    ) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({
        foo: [
            { lang: 'en', value: new XMLElement('foo', { 'xml:lang': 'en' }).toJSON() },
            { lang: 'no', value: new XMLElement('foo', { 'xml:lang': 'no' }).toJSON() }
        ]
    });
});

test('[Type: childAlternateLanguageRawElement] Basic export, multiple languages', () => {
    const ex = registry.export<Example>('example', {
        foo: [
            { lang: 'en', value: new XMLElement('foo', { 'xml:lang': 'en' }).toJSON() },
            { lang: 'no', value: new XMLElement('foo', { 'xml:lang': 'no' }).toJSON() }
        ]
    });
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x><foo xml:lang="en"/><foo xml:lang="no"/></x>');
});

test('[Type: childAlternateLanguageRawElement] Basic import, multiple languages, with default lang', () => {
    const ex = registry.import(
        parse(`
          <x xml:lang="en">
            <foo />
            <foo xml:lang="no" />
          </x>
        `)
    ) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({
        foo: [
            { lang: 'en', value: new XMLElement('foo').toJSON() },
            { lang: 'no', value: new XMLElement('foo', { 'xml:lang': 'no' }).toJSON() }
        ]
    });
});

test('[Type: childAlternateLanguageRawElement] Export with duplicate language', () => {
    const ex = registry.export<Example>(
        'example',
        {
            foo: [
                { lang: 'en', value: 'test en' },
                { lang: 'no', value: 'test no' }
            ]
        },
        {
            lang: 'en'
        }
    );
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x><foo>test en</foo><foo xml:lang="no">test no</foo></x>');
});

test('[Type: childAlternateLanguageRawElement] Import with sanitizer', () => {
    const ex = registry.import(parse('<x2><foo><bad/><good/></foo></x2>'), {
        sanitizers: {
            removeBad
        }
    }) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({
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
    });
});

test('[Type: childAlternateLanguageRawElement] Export with sanitizer', () => {
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
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x2><foo><good/></foo></x2>');
});

test('[Type: childAlternateLanguageRawElement] Import with missing sanitizer', () => {
    const ex = registry.import(parse('<x2><foo><good/></foo></x2>'), {
        sanitizers: {}
    }) as Example;
    expect(ex).toBeTruthy();
    expect(ex).toEqual({});
});

test('[Type: childAlternateLanguageRawElement] Export with missing sanitizer', () => {
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
    expect(ex).toBeTruthy();
    expect(ex!.toString()).toBe('<x2/>');
});
