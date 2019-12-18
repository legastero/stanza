import expect from 'expect';

import * as JXT from '../../src/jxt';

interface Message {
    id?: string;
    body?: string;
    bodies?: JXT.LanguageSet<string>;
}

const def = JXT.define({
    element: 'message',
    fields: {
        lang: JXT.languageAttribute(),
        body: JXT.childText(null, 'body'),
        bodies: JXT.multipleChildAlternateLanguageText(null, 'body')
    },
    namespace: 'jabber:client',
    path: 'message'
});

test('Shortcut accept languages', () => {
    const registry = new JXT.Registry();
    registry.define(def);

    const opts: JXT.TranslationContext = {
        lang: 'EN-US',
        acceptLanguages: ['EN-US', 'EN', 'NO']
    };

    const data: Message = registry.import(
        JXT.parse(`
        <message xmlns="jabber:client">
          <body xml:lang="no">Hallo verden</body>
          <body xml:lang="en-US">Hello world, from the US</body>
          <body xml:lang="en">Hello world</body>
          <body xml:lang="en-CA">Hello world, from Canada</body>
          <body xml:lang="se">Hej världen</body>
          <body xml:lang="es">Hola mundo</body>
          <body xml:lang="de">Hallo Welt</body>
        </message>
    `),
        opts
    )! as Message;

    expect(data.body).toBe('Hello world, from the US');
});

test('Wildcard accept languages', () => {
    const registry = new JXT.Registry();
    registry.define(def);

    const opts: JXT.TranslationContext = {
        acceptLanguages: ['*']
    };

    const data: Message = registry.import(
        JXT.parse(`
        <message xmlns="jabber:client">
          <body xml:lang="no">Hallo verden</body>
          <body xml:lang="en-US">Hello world, from the US</body>
          <body xml:lang="en">Hello world</body>
          <body xml:lang="en-CA">Hello world, from Canada</body>
          <body xml:lang="se">Hej världen</body>
          <body xml:lang="es">Hola mundo</body>
          <body xml:lang="de">Hallo Welt</body>
        </message>
    `),
        opts
    )! as Message;

    expect(data.body).toBe('Hallo verden');
});

test('Private use lang tags', () => {
    const registry = new JXT.Registry();
    registry.define(def);

    const opts: JXT.TranslationContext = {
        acceptLanguages: ['en-CA-x-slang']
    };

    const data: Message = registry.import(
        JXT.parse(`
        <message xmlns="jabber:client">
          <body xml:lang="no">Hallo verden</body>
          <body xml:lang="en-US">Hello world, from the US</body>
          <body xml:lang="en">Hello world</body>
          <body xml:lang="en-CA">Hello world, from Canada</body>
          <body xml:lang="se">Hej världen</body>
          <body xml:lang="es">Hola mundo</body>
          <body xml:lang="de">Hallo Welt</body>
        </message>
    `),
        opts
    )! as Message;

    expect(data.body).toBe('Hello world, from Canada');
});
