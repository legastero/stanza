import expect from 'expect';

import * as JXT from '../../src/jxt';
import { NS_XHTML } from '../../src/Namespaces';

function setup(): JXT.Registry {
    const registry = new JXT.Registry();

    registry.define({
        element: 'html',
        fields: {
            body: JXT.childLanguageRawElement(NS_XHTML, 'body', 'xhtmlim'),
            notBody: JXT.childLanguageRawElement(null, 'not-body', 'xhtmlim'),
            missingNS: JXT.childLanguageRawElement(null, 'body', 'xhtmlim')
        },
        namespace: '',
        path: 'html'
    });

    return registry;
}

test('[Sanitizer]', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}"><p>test</p></body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            xmlns: NS_XHTML
        },
        children: [
            {
                attributes: {},
                children: ['test'],
                name: 'p'
            }
        ],
        name: 'body'
    });
});

test('[Sanitizer] Remove CSS comments', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}"><p style="/* */">test</p></body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            xmlns: NS_XHTML
        },
        children: [
            {
                attributes: {},
                children: ['test'],
                name: 'p'
            }
        ],
        name: 'body'
    });
});

test('[Sanitizer] Remove CSS rule with invalid value', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}"><p style="font-weight: x">test</p></body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            xmlns: NS_XHTML
        },
        children: [
            {
                attributes: {},
                children: ['test'],
                name: 'p'
            }
        ],
        name: 'body'
    });
});

test('[Sanitizer] Remove unknown CSS rule', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}"><p style="x: y">test</p></body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            xmlns: NS_XHTML
        },
        children: [
            {
                attributes: {},
                children: ['test'],
                name: 'p'
            }
        ],
        name: 'body'
    });
});

test('[Sanitizer] Remove disallowed child', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}"><script>alert(1)</script><p>test</p></body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            xmlns: NS_XHTML
        },
        children: [
            {
                attributes: {},
                children: ['test'],
                name: 'p'
            }
        ],
        name: 'body'
    });
});

test('[Sanitizer] Remove disallowed attribute', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}"><p onclick="alert(1)">test</p></body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            xmlns: NS_XHTML
        },
        children: [
            {
                attributes: {},
                children: ['test'],
                name: 'p'
            }
        ],
        name: 'body'
    });
});

test('[Sanitizer] Unknown tags, known child', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}"><unknown><p>test</p></unknown></body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            xmlns: NS_XHTML
        },
        children: [
            {
                attributes: {},
                children: ['test'],
                name: 'p'
            }
        ],
        name: 'body'
    });
});

test('[Sanitizer] Unknown tags, unknown child', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}"><unknown>before <more>test</more> after</unknown></body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            xmlns: NS_XHTML
        },
        children: ['before ', 'test', ' after'],
        name: 'body'
    });
});

test('[Sanitizer] Unknown tags, empty child', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}"><unknown>before <script /> after</unknown></body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            xmlns: NS_XHTML
        },
        children: ['before ', ' after'],
        name: 'body'
    });
});

test('[Sanitizer] Not using body element', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <not-body>text</not-body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.notBody).toBe(undefined);
});

test('[Sanitizer] CSS', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body>text</body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.notBody).toBe(undefined);
});

test('[Sanitizer] Allowed CSS', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}" style="font-weight: bold">text</body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            style: 'font-weight: bold',
            xmlns: NS_XHTML
        },
        children: ['text'],
        name: 'body'
    });
});

test('[Sanitizer] Empty attribute', () => {
    const registry = setup();

    const msgXML = JXT.parse(`
            <html>
              <body xmlns="${NS_XHTML}"><img src="" /></body>
            </html>
        `);
    const data = registry.import(msgXML)!;

    expect(data.body).toStrictEqual({
        attributes: {
            xmlns: NS_XHTML
        },
        children: [
            {
                attributes: {},
                children: [],
                name: 'img'
            }
        ],
        name: 'body'
    });
});
