import * as tape from 'tape';

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

const test = tape.test;

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

export default function runTests() {
    test('[Types] Top-level Attributes', t => {
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

        t.equal(imported.attribute, 'string', 'Basic attribute');
        t.equal(imported.booleanAttribute, true, 'Boolean attribute');
        t.equal(imported.integerAttribute, 5, 'Integer attribute');
        t.equal(imported.floatAttribute, 6.28, 'Float attribute');
        t.equal(
            imported.dateAttribute!.toString(),
            new Date('2000-01-01').toString(),
            'Date attribute'
        );
        t.equal(imported.languageAttribute, 'en', 'Language attribute');

        t.end();
    });

    test('[Types] Text', t => {
        const registry = setupRegistry();

        const exported1 = registry.export('test', { text: 'string' } as Tester)!;
        const exported2 = registry.export('test', { base64Text: 'string' } as Tester)!;
        const exported3 = registry.export('test', { hexText: 'string' } as Tester)!;

        const imported1 = registry.import(exported1) as Tester;
        const imported2 = registry.import(exported2) as Tester;
        const imported3 = registry.import(exported3) as Tester;

        t.equal(imported1.text, 'string', 'Basic text');
        t.equal((imported2.base64Text as Buffer).toString('utf8'), 'string', 'Base64 text');
        t.equal((imported3.hexText as Buffer).toString('utf8'), 'string', 'Hex text');
        t.end();
    });

    test('[Types] Child Attributes', t => {
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

        t.equal(imported.childAttribute, 'string', 'Basic attribute');
        t.equal(imported.childBooleanAttribute, true, 'Boolean attribute');
        t.equal(imported.childIntegerAttribute, 5, 'Integer attribute');
        t.equal(imported.childFloatAttribute, 6.28, 'Float attribute');
        t.equal(
            imported.childDateAttribute!.toString(),
            new Date('2000-01-01').toString(),
            'Date attribute'
        );
        t.equal(imported.childLanguageAttribute, 'en', 'Language attribute');

        t.end();
    });

    test('[Types] Child Values', t => {
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

        t.equal(imported.childText, 'string', 'Child text');
        t.equal(
            (imported.childBase64Text as Buffer).toString('utf8'),
            'string',
            'Child base64 text'
        );
        t.equal((imported.childHexText as Buffer).toString('utf8'), 'string', 'Child hex text');
        t.equal(imported.childInteger, 5, 'Child integer');
        t.equal(imported.childFloat, 6.28, 'Child float');
        t.equal(imported.childBoolean, true, 'Child boolean');
        t.equal(imported.childDate!.toString(), new Date('2000-01-01').toString(), 'Child date');
        t.equal(imported.childEnum, 'two', 'Child enum');
        t.equal(imported.mappedChildEnum, 'two', 'Mapped Child enum');
        t.deepEqual(imported.childDoubleEnum, ['two', 'c'], 'Child double enum');
        t.isEquivalent(imported.childJSON, { arbitrary: ['json'] }, 'Child JSON data');

        t.end();
    });

    test('[Types] Deep Child Values', t => {
        const registry = setupRegistry();

        const exported = registry.export('test', {
            deepChildBoolean: true
        } as Tester)!;
        const imported = registry.import(exported) as Tester;

        t.equal(imported.deepChildBoolean, true, 'Deep child boolean');

        t.end();
    });

    test('[Types] Static Values', t => {
        const registry = setupRegistry();

        const exported = registry.export('test', {
            staticValue: 'try-to-change'
        } as Tester)!;
        const imported = registry.import(exported) as Tester;

        t.equal(imported.staticValue, 'no-change', 'Static value');

        t.end();
    });

    test('[Types] Multiple child values', t => {
        const registry = setupRegistry();

        const exported = registry.export('test', {
            multipleChildAttribute: ['a', 'b', 'c'],
            multipleChildEnum: ['foo', 'bar'],
            multipleChildText: ['one', 'two', 'three'],
            multipleMappedChildEnum: ['foo', 'bar']
        } as Tester)!;
        const imported = registry.import(exported) as Tester;

        t.deepEqual(imported.multipleChildAttribute, ['a', 'b', 'c'], 'Multiple child attributes');
        t.deepEqual(imported.multipleChildText, ['one', 'two', 'three'], 'Multiple child text');
        t.deepEqual(imported.multipleChildEnum, ['foo', 'bar'], 'Multiple child enums');
        t.deepEqual(
            imported.multipleMappedChildEnum,
            ['foo', 'bar'],
            'Multiple mapped child enums'
        );

        t.end();
    });

    test('[Types] Language', t => {
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
        t.equal(
            exp1.toString(),
            `<wrapper xmlns="test" xml:lang="en"><sub/></wrapper>`,
            'Child omits xml:lang'
        );

        const exp2 = registry.export('test', {
            languageAttribute: 'en',
            subtest: {}
        } as Tester)!;
        const imp2 = registry.import(exp2) as Tester;
        t.equal(imp2.subtest!.lang, 'en', 'Child inherits xml:lang context');

        const exp3 = registry.export('test', {
            languageAttribute: 'en',
            subtest: {
                lang: 'no'
            }
        } as Tester)!;
        const imp3 = registry.import(exp3) as Tester;
        t.equal(
            exp3.toString(),
            `<wrapper xmlns="test" xml:lang="en"><sub xml:lang="no"/></wrapper>`,
            'Child includes xml:lang'
        );
        t.equal(imp3.subtest!.lang, 'no', 'Child inherits xml:lang context');
        t.end();
    });

    test('[Types] Child text language', t => {
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

        t.equal(
            importNL.childText,
            'Hej världen',
            'No preferred language given, using stanza language'
        );
        t.equal(importEn.childText, 'Hello world', 'Extracted English text');
        t.equal(importNo.childText, 'Hallo verden', 'Extracted Norwegian text');
        t.equal(importEs.childText, 'Hola mundo', 'Extracted Spanish text');
        t.equal(importDe.childText, 'Hallo Welt', 'Extracted German text');
        t.equal(importSv.childText, 'Hej världen', 'Extracted Swedish text');
        t.equal(
            importX1.childText,
            'Hej världen',
            'Preferred language not found, fallback to stanza language text'
        );
        t.equal(
            importX2.childText,
            'Hallo Welt',
            'Fallback to second preferred language, extracted German text'
        );
        t.equal(importEnUS.childText, 'Hello world, from the US', 'Extracted English (US) text');
        t.equal(
            importEnGB.childText,
            'Hello world',
            'English (GB) not found, extracted English text'
        );

        t.same(
            importNo.childAlternateLanguageText,
            [
                { lang: 'no', value: 'Hallo verden' },
                { lang: 'en-us', value: 'Hello world, from the US' },
                { lang: 'en', value: 'Hello world' },
                { lang: 'en-ca', value: 'Hello world, from Canada' },
                { lang: 'sv', value: 'Hej världen' },
                { lang: 'es', value: 'Hola mundo' },
                { lang: 'de', value: 'Hallo Welt' }
            ],
            'Extracted alternate languages'
        );

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
        t.same(
            reimported.childAlternateLanguageText,
            [
                { lang: 'no', value: 'Hallo verden' },
                { lang: 'en-us', value: 'Hello world, from the US' },
                { lang: 'en', value: 'Hello world' },
                { lang: 'en-ca', value: 'Hello world, from Canada' },
                { lang: 'sv', value: 'Hej världen' },
                { lang: 'es', value: 'Hola mundo' },
                { lang: 'de', value: 'Hallo Welt' }
            ],
            'Extracted exported alternate languages'
        );

        t.end();
    });

    test('[Types] Multiple child text language', t => {
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

        t.same(
            importNL.multipleChildText,
            ['1-Hej världen', '2-Hej världen'],
            'No preferred language given, using stanza language'
        );
        t.same(
            importEn.multipleChildText,
            ['1-Hello world', '2-Hello world'],
            'Extracted English text'
        );
        t.same(
            importNo.multipleChildText,
            ['1-Hallo verden', '2-Hallo verden'],
            'Extracted Norwegian text'
        );
        t.same(
            importEs.multipleChildText,
            ['1-Hola mundo', '2-Hola mundo'],
            'Extracted Spanish text'
        );
        t.same(
            importDe.multipleChildText,
            ['1-Hallo Welt', '2-Hallo Welt'],
            'Extracted German text'
        );
        t.same(
            importSv.multipleChildText,
            ['1-Hej världen', '2-Hej världen'],
            'Extracted Swedish text'
        );
        t.same(
            importX1.multipleChildText,
            ['1-Hej världen', '2-Hej världen'],
            'Preferred language not found, fallback to stanza language text'
        );
        t.same(
            importX2.multipleChildText,
            ['1-Hallo Welt', '2-Hallo Welt'],
            'Fallback to second preferred language, extracted German text'
        );
        t.same(
            importEnUS.multipleChildText,
            ['1-Hello world, from the US', '2-Hello world, from the US'],
            'Extracted English (US) text'
        );
        t.same(
            importEnGB.multipleChildText,
            ['1-Hello world', '2-Hello world'],
            'English (GB) not found, extracted English text'
        );

        const exported = registry.export('test', {
            multipleChildAlternateLanguageText: [
                { lang: 'no', value: ['en', 'to', 'tre'] },
                { lang: 'en', value: ['one', 'two', 'three'] },
                { lang: 'es', value: ['uno', 'dos', 'tres'] },
                { lang: 'de', value: ['eines', 'zwei', 'drei'] }
            ]
        } as Tester)!;
        const imported = registry.import(exported) as Tester;

        t.same(
            imported.multipleChildAlternateLanguageText,
            [
                { lang: 'no', value: ['en', 'to', 'tre'] },
                { lang: 'en', value: ['one', 'two', 'three'] },
                { lang: 'es', value: ['uno', 'dos', 'tres'] },
                { lang: 'de', value: ['eines', 'zwei', 'drei'] }
            ],
            'Multiple child alternate languages'
        );

        t.end();
    });

    test('[Types] Namespaced fields', t => {
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

        t.equal(imported.namespacedAttribute, 'nsstring', 'Basic namespaced attribute');
        t.equal(imported.namespacedBooleanAttribute, true, 'Basic namespaced boolean attribute');
        t.equal(imported.namespacedIntegerAttribute, 42, 'Basic namespaced integer attribute');
        t.equal(imported.namespacedFloatAttribute, 8.5, 'Basic namespaced float attribute');
        t.equal(
            imported.namespacedDateAttribute!.toISOString(),
            time.toISOString(),
            'Basic namespaced date attribute'
        );

        t.end();
    });
}
