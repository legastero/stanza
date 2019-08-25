import expect from 'expect';

import {
    attribute,
    booleanAttribute,
    childAlternateLanguageText,
    childAttribute,
    childBoolean,
    childBooleanAttribute,
    childDate,
    childDateAttribute,
    childDoubleEnum,
    childEnum,
    childFloat,
    childFloatAttribute,
    childInteger,
    childIntegerAttribute,
    childJSON,
    childLanguageAttribute,
    childText,
    childTextBuffer,
    dateAttribute,
    deepChildBoolean,
    floatAttribute,
    integerAttribute,
    JSONData,
    languageAttribute,
    LanguageSet,
    multipleChildAlternateLanguageText,
    multipleChildAttribute,
    multipleChildEnum,
    multipleChildText,
    namespacedAttribute,
    namespacedBooleanAttribute,
    namespacedDateAttribute,
    namespacedFloatAttribute,
    namespacedIntegerAttribute,
    parse,
    Registry,
    staticValue,
    text,
    textBuffer
} from '../../src/jxt';

interface Tester {
    attribute?: string;
    booleanAttribute?: boolean;
    integerAttribute?: number;
    floatAttribute?: number;
    dateAttribute?: string | Date;
    languageAttribute?: string;
    text?: string;
    base64Text?: Buffer | string;
    hexText?: Buffer | string;
    childAttribute?: string;
    childBooleanAttribute?: boolean;
    childIntegerAttribute?: number;
    childFloatAttribute?: number;
    childDateAttribute?: string | Date;
    childLanguageAttribute?: string;
    childText?: string;
    childBase64Text?: Buffer | string;
    childHexText?: Buffer | string;
    childInteger?: number;
    childFloat?: number;
    childBoolean?: boolean;
    childDate?: Date | string;
    childDoubleEnum?: [string] | [string, string];
    childEnum?: string;
    childJSON?: JSONData;
    deepChildBoolean?: boolean;
    mappedChildEnum?: string;
    multipleChildAttribute?: string[];
    multipleChildText?: string[];
    multipleChildEnum?: string[];
    multipleMappedChildEnum?: string[];
    childAlternateLanguageText?: LanguageSet<string>;
    multipleChildAlternateLanguageText?: LanguageSet<string[]>;
    staticValue?: string;
    subtest?: {
        lang?: string;
    };
    namespacedAttribute?: string;
    namespacedIntegerAttribute?: number;
    namespacedFloatAttribute?: number;
    namespacedBooleanAttribute?: boolean;
    namespacedDateAttribute?: Date;
}

function setupRegistry(): Registry {
    const registry = new Registry();

    registry.define({
        element: 'wrapper',
        fields: {
            attribute: attribute('a'),
            base64Text: textBuffer('base64'),
            booleanAttribute: booleanAttribute('b'),
            childAlternateLanguageText: childAlternateLanguageText('test', 'ca'),
            childAttribute: childAttribute('test', 'child', 'a'),
            childBase64Text: childTextBuffer('test', 'cb', 'base64'),
            childBoolean: childBoolean('test', 'cd'),
            childBooleanAttribute: childBooleanAttribute('test', 'child', 'b'),
            childDate: childDate('test', 'cg'),
            childDateAttribute: childDateAttribute('test', 'child', 'e'),
            childDoubleEnum: childDoubleEnum('test', ['one', 'two', 'three'], ['a', 'b', 'c']),
            childEnum: childEnum('test', ['one', 'two', 'three']),
            childFloat: childFloat('test', 'cf'),
            childFloatAttribute: childFloatAttribute('test', 'child', 'd'),
            childHexText: childTextBuffer('test', 'cc', 'hex'),
            childInteger: childInteger('test', 'ce'),
            childIntegerAttribute: childIntegerAttribute('test', 'child', 'c'),
            childJSON: childJSON('test', 'json'),
            childLanguageAttribute: childLanguageAttribute('test', 'child'),
            childText: childText('test', 'ca'),
            dateAttribute: dateAttribute('e'),
            deepChildBoolean: deepChildBoolean([
                { namespace: 'test', element: 'dcb1' },
                { namespace: 'test', element: 'dcb2' }
            ]),
            floatAttribute: floatAttribute('d'),
            hexText: textBuffer('hex'),
            integerAttribute: integerAttribute('c'),
            languageAttribute: languageAttribute(),
            mappedChildEnum: childEnum('test', [['one', 'O'], ['two', 'TW'], ['three', 'TH']]),
            multipleChildAlternateLanguageText: multipleChildAlternateLanguageText('test', 'ci'),
            multipleChildAttribute: multipleChildAttribute('test', 'ch', 'attr'),
            multipleChildEnum: multipleChildEnum('test', ['foo', 'bar', 'baz']),
            multipleChildText: multipleChildText('test', 'ci'),
            multipleMappedChildEnum: multipleChildEnum('test', [
                ['foo', 'F'],
                ['bar', 'BR'],
                ['baz', 'BZ']
            ]),
            namespacedAttribute: namespacedAttribute('x', 'otherns', 'nsattr'),
            namespacedBooleanAttribute: namespacedBooleanAttribute('x', 'otherns', 'nsboolattr'),
            namespacedDateAttribute: namespacedDateAttribute('x', 'otherns', 'nsdateattr'),
            namespacedFloatAttribute: namespacedFloatAttribute('x', 'otherns', 'nsfloatatr'),
            namespacedIntegerAttribute: namespacedIntegerAttribute('x', 'otherns', 'nsintatr'),
            staticValue: staticValue('no-change'),
            text: text()
        },
        languageField: 'languageAttribute',
        namespace: 'test',
        path: 'test'
    });

    return registry;
}

test('[Types] Top-level Attributes', () => {
    const registry = setupRegistry();

    const exported = registry.export('test', {
        attribute: 'string',
        booleanAttribute: true,
        dateAttribute: new Date('2000-01-01'),
        floatAttribute: 6.28,
        integerAttribute: 5,
        languageAttribute: 'en'
    } as Tester)!;
    const imported = registry.import(exported) as Tester;

    expect(imported.attribute).toBe('string');
    expect(imported.booleanAttribute).toBe(true);
    expect(imported.integerAttribute).toBe(5);
    expect(imported.floatAttribute).toBe(6.28);
    expect(imported.dateAttribute!.toString()).toBe(new Date('2000-01-01').toString());
    expect(imported.languageAttribute).toBe('en');
});

test('[Types] Text', () => {
    const registry = setupRegistry();

    const exported1 = registry.export('test', { text: 'string' } as Tester)!;
    const exported2 = registry.export('test', { base64Text: 'string' } as Tester)!;
    const exported3 = registry.export('test', { hexText: 'string' } as Tester)!;

    const imported1 = registry.import(exported1) as Tester;
    const imported2 = registry.import(exported2) as Tester;
    const imported3 = registry.import(exported3) as Tester;

    expect(imported1.text).toBe('string');
    expect((imported2.base64Text as Buffer).toString('utf8')).toBe('string');
    expect((imported3.hexText as Buffer).toString('utf8')).toBe('string');
});

test('[Types] Child Attributes', () => {
    const registry = setupRegistry();

    const exported = registry.export('test', {
        childAttribute: 'string',
        childBooleanAttribute: true,
        childDateAttribute: new Date('2000-01-01'),
        childFloatAttribute: 6.28,
        childIntegerAttribute: 5,
        childLanguageAttribute: 'en'
    } as Tester)!;
    const imported = registry.import(exported) as Tester;

    expect(imported.childAttribute).toBe('string');
    expect(imported.childBooleanAttribute).toBe(true);
    expect(imported.childIntegerAttribute).toBe(5);
    expect(imported.childFloatAttribute).toBe(6.28);
    expect(imported.childDateAttribute!.toString()).toBe(new Date('2000-01-01').toString());
    expect(imported.childLanguageAttribute).toBe('en');
});

test('[Types] Child Values', () => {
    const registry = setupRegistry();

    const exported = registry.export('test', {
        childBase64Text: 'string',
        childBoolean: true,
        childDate: new Date('2000-01-01'),
        childDoubleEnum: ['two', 'c'],
        childEnum: 'two',
        childFloat: 6.28,
        childHexText: 'string',
        childInteger: 5,
        childJSON: { arbitrary: ['json'] },
        childText: 'string',
        mappedChildEnum: 'two'
    } as Tester)!;
    const imported = registry.import(exported) as Tester;

    expect(imported.childText).toBe('string');
    expect((imported.childBase64Text as Buffer).toString('utf8')).toBe('string');
    expect((imported.childHexText as Buffer).toString('utf8')).toBe('string');
    expect(imported.childInteger).toBe(5);
    expect(imported.childFloat).toBe(6.28);
    expect(imported.childBoolean).toBe(true);
    expect(imported.childDate!.toString()).toBe(new Date('2000-01-01').toString());
    expect(imported.childEnum).toBe('two');
    expect(imported.mappedChildEnum).toBe('two');
    expect(imported.childDoubleEnum).toEqual(['two', 'c']);
    expect(imported.childJSON).toEqual({ arbitrary: ['json'] });
});

test('[Types] Deep Child Values', () => {
    const registry = setupRegistry();

    const exported = registry.export('test', {
        deepChildBoolean: true
    } as Tester)!;
    const imported = registry.import(exported) as Tester;

    expect(imported.deepChildBoolean).toBe(true);
});

test('[Types] Static Values', () => {
    const registry = setupRegistry();

    const exported = registry.export('test', {
        staticValue: 'try-to-change'
    } as Tester)!;
    const imported = registry.import(exported) as Tester;

    expect(imported.staticValue).toBe('no-change');
});

test('[Types] Multiple child values', () => {
    const registry = setupRegistry();

    const exported = registry.export('test', {
        multipleChildAttribute: ['a', 'b', 'c'],
        multipleChildEnum: ['foo', 'bar'],
        multipleChildText: ['one', 'two', 'three'],
        multipleMappedChildEnum: ['foo', 'bar']
    } as Tester)!;
    const imported = registry.import(exported) as Tester;

    expect(imported.multipleChildAttribute).toEqual(['a', 'b', 'c']);
    expect(imported.multipleChildText).toEqual(['one', 'two', 'three']);
    expect(imported.multipleChildEnum).toEqual(['foo', 'bar']);
    expect(imported.multipleMappedChildEnum).toEqual(['foo', 'bar']);
});

test('[Types] Language', () => {
    const registry = setupRegistry();

    registry.define({
        element: 'sub',
        fields: {
            lang: languageAttribute()
        },
        namespace: 'test',
        path: 'test.subtest'
    });

    const exp1 = registry.export('test', {
        languageAttribute: 'en',
        subtest: {
            lang: 'en'
        }
    } as Tester)!;
    expect(exp1.toString()).toBe(`<wrapper xmlns="test" xml:lang="en"><sub/></wrapper>`);

    const exp2 = registry.export('test', {
        languageAttribute: 'en',
        subtest: {}
    } as Tester)!;
    const imp2 = registry.import(exp2) as Tester;
    expect(imp2.subtest!.lang).toBe('en');

    const exp3 = registry.export('test', {
        languageAttribute: 'en',
        subtest: {
            lang: 'no'
        }
    } as Tester)!;
    const imp3 = registry.import(exp3) as Tester;
    expect(exp3.toString()).toBe(
        `<wrapper xmlns="test" xml:lang="en"><sub xml:lang="no"/></wrapper>`
    );
    expect(imp3.subtest!.lang).toBe('no');
});

test('[Types] Child text language', () => {
    const registry = setupRegistry();
    const langXML = parse(`
            <wrapper xmlns="test" xml:lang="sv">
              <ca xml:lang="no">Hallo verden</ca>
              <ca xml:lang="en-US">Hello world, from the US</ca>
              <ca xml:lang="en">Hello world</ca>
              <ca xml:lang="en-CA">Hello world, from Canada</ca>
              <ca>Hej världen</ca>
              <ca xml:lang="es">Hola mundo</ca>
              <ca xml:lang="de">Hallo Welt</ca>
            </wrapper>`);

    const importNL = registry.import(langXML) as Tester;
    const importEn = registry.import(langXML, { acceptLanguages: ['en'] }) as Tester;
    const importNo = registry.import(langXML, { acceptLanguages: ['no'] }) as Tester;
    const importEs = registry.import(langXML, { acceptLanguages: ['es'] }) as Tester;
    const importDe = registry.import(langXML, { acceptLanguages: ['de'] }) as Tester;
    const importSv = registry.import(langXML, { acceptLanguages: ['sv'] }) as Tester;
    const importX1 = registry.import(langXML, { acceptLanguages: ['xx'] }) as Tester;
    const importX2 = registry.import(langXML, { acceptLanguages: ['xx', 'de'] }) as Tester;
    const importEnUS = registry.import(langXML, { acceptLanguages: ['en-us'] }) as Tester;
    const importEnGB = registry.import(langXML, { acceptLanguages: ['en-gb'] }) as Tester;

    expect(importNL.childText).toBe('Hej världen');
    expect(importEn.childText).toBe('Hello world');
    expect(importNo.childText).toBe('Hallo verden');
    expect(importEs.childText).toBe('Hola mundo');
    expect(importDe.childText).toBe('Hallo Welt');
    expect(importSv.childText).toBe('Hej världen');
    expect(importX1.childText).toBe('Hej världen');
    expect(importX2.childText).toBe('Hallo Welt');
    expect(importEnUS.childText).toBe('Hello world, from the US');
    expect(importEnGB.childText).toBe('Hello world');

    expect(importNo.childAlternateLanguageText).toEqual([
        { lang: 'no', value: 'Hallo verden' },
        { lang: 'en-us', value: 'Hello world, from the US' },
        { lang: 'en', value: 'Hello world' },
        { lang: 'en-ca', value: 'Hello world, from Canada' },
        { lang: 'sv', value: 'Hej världen' },
        { lang: 'es', value: 'Hola mundo' },
        { lang: 'de', value: 'Hallo Welt' }
    ]);

    const exported = registry.export(
        'test',
        {
            childAlternateLanguageText: [
                { lang: 'no', value: 'Hallo verden' },
                { lang: 'en-us', value: 'Hello world, from the US' },
                { lang: 'en', value: 'Hello world' },
                { lang: 'en-ca', value: 'Hello world, from Canada' },
                { lang: 'sv', value: 'Hej världen' },
                { lang: 'es', value: 'Hola mundo' },
                { lang: 'de', value: 'Hallo Welt' }
            ]
        } as Tester,
        { lang: 'no' }
    )!;
    const reimported = registry.import(exported, { lang: 'no' }) as Tester;
    expect(reimported.childAlternateLanguageText).toEqual([
        { lang: 'no', value: 'Hallo verden' },
        { lang: 'en-us', value: 'Hello world, from the US' },
        { lang: 'en', value: 'Hello world' },
        { lang: 'en-ca', value: 'Hello world, from Canada' },
        { lang: 'sv', value: 'Hej världen' },
        { lang: 'es', value: 'Hola mundo' },
        { lang: 'de', value: 'Hallo Welt' }
    ]);
});

test('[Types] Multiple child text language', () => {
    const registry = setupRegistry();
    const langXML = parse(`
            <wrapper xmlns="test" xml:lang="sv">
              <ci xml:lang="no">1-Hallo verden</ci>
              <ci xml:lang="no">2-Hallo verden</ci>
              <ci xml:lang="en-US">1-Hello world, from the US</ci>
              <ci xml:lang="en-US">2-Hello world, from the US</ci>
              <ci xml:lang="en">1-Hello world</ci>
              <ci xml:lang="en">2-Hello world</ci>
              <ci xml:lang="en-CA">1-Hello world, from Canada</ci>
              <ci xml:lang="en-CA">2-Hello world, from Canada</ci>
              <ci>1-Hej världen</ci>
              <ci>2-Hej världen</ci>
              <ci xml:lang="es">1-Hola mundo</ci>
              <ci xml:lang="es">2-Hola mundo</ci>
              <ci xml:lang="de">1-Hallo Welt</ci>
              <ci xml:lang="de">2-Hallo Welt</ci>
            </wrapper>`);

    const importNL = registry.import(langXML) as Tester;
    const importEn = registry.import(langXML, { acceptLanguages: ['en'] }) as Tester;
    const importNo = registry.import(langXML, { acceptLanguages: ['no'] }) as Tester;
    const importEs = registry.import(langXML, { acceptLanguages: ['es'] }) as Tester;
    const importDe = registry.import(langXML, { acceptLanguages: ['de'] }) as Tester;
    const importSv = registry.import(langXML, { acceptLanguages: ['sv'] }) as Tester;
    const importX1 = registry.import(langXML, { acceptLanguages: ['xx'] }) as Tester;
    const importX2 = registry.import(langXML, { acceptLanguages: ['xx', 'de'] }) as Tester;
    const importEnUS = registry.import(langXML, { acceptLanguages: ['en-us'] }) as Tester;
    const importEnGB = registry.import(langXML, { acceptLanguages: ['en-gb'] }) as Tester;

    expect(importNL.multipleChildText).toEqual(['1-Hej världen', '2-Hej världen']);
    expect(importEn.multipleChildText).toEqual(['1-Hello world', '2-Hello world']);
    expect(importNo.multipleChildText).toEqual(['1-Hallo verden', '2-Hallo verden']);
    expect(importEs.multipleChildText).toEqual(['1-Hola mundo', '2-Hola mundo']);
    expect(importDe.multipleChildText).toEqual(['1-Hallo Welt', '2-Hallo Welt']);
    expect(importSv.multipleChildText).toEqual(['1-Hej världen', '2-Hej världen']);
    expect(importX1.multipleChildText).toEqual(['1-Hej världen', '2-Hej världen']);
    expect(importX2.multipleChildText).toEqual(['1-Hallo Welt', '2-Hallo Welt']);
    expect(importEnUS.multipleChildText).toEqual([
        '1-Hello world, from the US',
        '2-Hello world, from the US'
    ]);
    expect(importEnGB.multipleChildText).toEqual(['1-Hello world', '2-Hello world']);

    const exported = registry.export('test', {
        multipleChildAlternateLanguageText: [
            { lang: 'no', value: ['en', 'to', 'tre'] },
            { lang: 'en', value: ['one', 'two', 'three'] },
            { lang: 'es', value: ['uno', 'dos', 'tres'] },
            { lang: 'de', value: ['eines', 'zwei', 'drei'] }
        ]
    } as Tester)!;
    const imported = registry.import(exported) as Tester;

    expect(imported.multipleChildAlternateLanguageText).toEqual([
        { lang: 'no', value: ['en', 'to', 'tre'] },
        { lang: 'en', value: ['one', 'two', 'three'] },
        { lang: 'es', value: ['uno', 'dos', 'tres'] },
        { lang: 'de', value: ['eines', 'zwei', 'drei'] }
    ]);
});

test('[Types] Namespaced fields', () => {
    const registry = setupRegistry();

    const time = new Date(Date.now());

    const exported = registry.export('test', {
        namespacedAttribute: 'nsstring',
        namespacedBooleanAttribute: true,
        namespacedDateAttribute: time,
        namespacedFloatAttribute: 8.5,
        namespacedIntegerAttribute: 42
    } as Tester)!;
    const imported = registry.import(exported) as Tester;

    expect(imported.namespacedAttribute).toBe('nsstring');
    expect(imported.namespacedBooleanAttribute).toBe(true);
    expect(imported.namespacedIntegerAttribute).toBe(42);
    expect(imported.namespacedFloatAttribute).toBe(8.5);
    expect(imported.namespacedDateAttribute!.toISOString()).toBe(time.toISOString());
});
