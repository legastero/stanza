import * as tape from 'tape';

import * as JXT from '../../src/jxt';

const test = tape.test;

interface Message {
    body?: string;
    lang?: string;
    html?: {
        lang?: string;
        body?: JXT.XMLElement | string;
        langBody?: JXT.XMLElement | string;
        alternateLangBodies?: JXT.LanguageSet<JXT.JSONElement | string>;
        safeBody?: JXT.XMLElement | string;
    };
}

function setupRegistry(): JXT.Registry {
    const registry = new JXT.Registry();

    registry.define({
        element: 'message',
        fields: {
            body: JXT.childText(null, 'body'),
            lang: JXT.languageAttribute()
        },
        namespace: 'jabber:client',
        path: 'message'
    });

    registry.define({
        element: 'html',
        fields: {
            alternateLangBodies: JXT.childAlternateLanguageRawElement(
                'http://www.w3.org/1999/xhtml',
                'body'
            ),
            body: JXT.childRawElement('http://www.w3.org/1999/xhtml', 'body'),
            langBody: JXT.childLanguageRawElement('http://www.w3.org/1999/xhtml', 'body'),
            safeBody: JXT.childRawElement('http://www.w3.org/1999/xhtml', 'body', 'xhtmlim')
        },
        namespace: 'http://jabber.org/protocol/xhtml-im',
        path: 'message.html'
    });

    return registry;
}

const htmlBody = (lang: string = '', message: string = 'hi!'): JXT.JSONElement => {
    const body: JXT.JSONElement = {
        attributes: {
            xmlns: 'http://www.w3.org/1999/xhtml'
        },
        children: [
            {
                attributes: {
                    style: 'font-weight:bold'
                },
                children: [message],
                name: 'p'
            }
        ],
        name: 'body'
    };
    if (lang) {
        body.attributes['xml:lang'] = lang;
    }
    return body;
};

export default function runTests() {
    test('[Import] Raw Element (XHTML)', t => {
        const registry = setupRegistry();

        const messageXML = JXT.parse(`
            <message xmlns='jabber:client'>
              <body>hi!</body>
              <html xmlns='http://jabber.org/protocol/xhtml-im'>
                <body xmlns='http://www.w3.org/1999/xhtml'><p style='font-weight:bold'>hi!</p></body>
              </html>
            </message>`);
        const msg = registry.import(messageXML) as Message;

        t.equal(msg.body, 'hi!', 'Plain body matches');
        t.ok(msg.html && msg.html.body, 'HTML body exists');
        t.deepEqual(msg.html!.body, htmlBody(), 'HTML body matches');
        t.end();
    });

    test('[Import] Raw Element (XHTML) by language', t => {
        const registry = setupRegistry();

        const messageXML = JXT.parse(`
            <message xmlns='jabber:client' xml:lang="en">
              <body>hi!</body>
              <html xmlns='http://jabber.org/protocol/xhtml-im'>
                <body xmlns='http://www.w3.org/1999/xhtml' xml:lang="fr"><p style='font-weight:bold'>bonjour!</p></body>
                <body xmlns='http://www.w3.org/1999/xhtml'><p style='font-weight:bold'>hi!</p></body>
                <body xmlns='http://www.w3.org/1999/xhtml' xml:lang="es"><p style='font-weight:bold'>hola!</p></body>
              </html>
            </message>`);

        const msgEs = registry.import(messageXML, { acceptLanguages: ['es'] }) as Message;
        t.ok(msgEs.html && msgEs.html.langBody, 'HTML body exists');
        t.deepEqual(msgEs.html!.langBody, htmlBody('es', 'hola!'), 'HTML body matches');
        t.deepEqual(
            msgEs.html!.alternateLangBodies,
            [
                { lang: 'fr', value: htmlBody('fr', 'bonjour!') },
                { lang: 'en', value: htmlBody('', 'hi!') },
                { lang: 'es', value: htmlBody('es', 'hola!') }
            ],
            'HTML alternate language bodies match'
        );

        const msgEn = registry.import(messageXML, { acceptLanguages: ['en'] }) as Message;
        t.ok(msgEn.html && msgEn.html.langBody, 'HTML body exists');
        t.deepEqual(msgEn.html!.langBody, htmlBody('', 'hi!'), 'HTML body matches');
        t.deepEqual(
            msgEs.html!.alternateLangBodies,
            [
                { lang: 'fr', value: htmlBody('fr', 'bonjour!') },
                { lang: 'en', value: htmlBody('', 'hi!') },
                { lang: 'es', value: htmlBody('es', 'hola!') }
            ],
            'HTML alternate language bodies match'
        );
        t.end();
    });

    test('[Export] Raw Element (XHTML)', t => {
        const registry = setupRegistry();

        const output = registry.export('message', {
            body: 'hi!',
            html: {
                body: htmlBody()
            }
        } as Message)!;

        const msg = registry.import(output) as Message;
        t.equal(msg.body, 'hi!', 'Plain body matches');
        t.ok(msg.html && msg.html.body, 'HTML body exists');
        t.deepEqual(msg.html!.body, htmlBody(), 'HTML body matches');
        t.end();
    });

    test('[Export] Raw Element (XHTML) as string', t => {
        const registry = setupRegistry();

        const output = registry.export('message', {
            body: 'hi!',
            html: {
                body: '<p style="font-weight:bold">hi!</p>'
            }
        } as Message)!;

        const msg = registry.import(output) as Message;
        t.equal(msg.body, 'hi!', 'Plain body matches');
        t.ok(msg.html && msg.html.body, 'HTML body exists');
        t.deepEqual(msg.html!.body, htmlBody(), 'HTML body matches');
        t.end();
    });

    test('[Export] Raw Element (XHTML) with language as string', t => {
        const registry = setupRegistry();

        const output = registry.export('message', {
            body: 'hi!',
            html: {
                alternateLangBodies: [
                    { lang: 'en', value: '<p style="font-weight:bold">hi!</p>' },
                    { lang: 'es', value: '<p style="font-weight:bold">hola!</p>' }
                ],
                langBody: '<p style="font-weight:bold">bonjour!</p>'
            },
            lang: 'fr'
        } as Message)!;

        const msg = registry.import(output) as Message;

        t.equal(msg.body, 'hi!', 'Plain body matches');
        t.ok(msg.html && msg.html.langBody, 'HTML body exists');
        t.deepEqual(msg.html!.langBody, htmlBody('', 'bonjour!'), 'HTML body matches');
        t.deepEqual(
            msg.html!.alternateLangBodies,
            [
                { lang: 'en', value: htmlBody('en', 'hi!') },
                { lang: 'es', value: htmlBody('es', 'hola!') },
                { lang: 'fr', value: htmlBody('', 'bonjour!') }
            ],
            'HTML alternate language bodies match'
        );
        t.end();
    });
}
