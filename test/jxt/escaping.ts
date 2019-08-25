import expect from 'expect';
import {
    attribute,
    childText,
    parse,
    ParsedData,
    Registry,
    StreamParser
} from '../../src/jxt/index';

interface Message {
    type: string;
    id: string;
    body?: string;
}

function setupRegistry(): Registry {
    const registry = new Registry();

    registry.define({
        element: 'message',
        fields: {
            body: childText(null, 'body'),
            id: attribute('id'),
            type: attribute('type')
        },
        namespace: 'jabber:client',
        path: 'message'
    });

    return registry;
}

test('[Escaping] Import with "', () => {
    const registry = setupRegistry();

    const messageXML = parse(`
        <message xmlns="jabber:client" type="&quot;normal&quot;" id="123">
            <body>test &quot;body&quot;</body>
        </message>`);

    const msg = registry.import(messageXML) as Message;

    expect(msg).toBeTruthy();
    expect(msg.type).toBe('"normal"');
    expect(msg.body).toBe('test "body"');
});

test('[Escaping] Export with "', () => {
    const registry = setupRegistry();

    const output = registry.export('message', {
        body: 'test "body"',
        id: '123',
        type: '"normal"'
    } as Message)!;

    const outputStr = output.toString();
    expect(outputStr).toBe(
        '<message xmlns="jabber:client" id="123" type="&quot;normal&quot;"><body>test "body"</body></message>'
    );

    const msg = registry.import(output) as Message;
    expect(msg.type).toBe('"normal"');
    expect(msg.body).toBe('test "body"');
});

test('[Parser] Import CDATA', () => {
    const registry = setupRegistry();

    const messageXML = parse(`
        <message xmlns="jabber:client" type="&quot;normal&quot;" id="123">
            <body><![CDATA[test "<>"]]></body>
        </message>`);

    const msg = registry.import(messageXML) as Message;

    expect(msg).toBeTruthy();
    expect(msg.type).toBe('"normal"');
    expect(msg.body).toBe('test "<>"');
});

test('[Parser] Ignore Comments', () => {
    const registry = setupRegistry();

    const messageXML = parse(
        `
        <!-- Should be ignored -->
        <message xmlns="jabber:client" id="123">
            <!-- More ignored -->
            <!-- <body>nope</body> -->
            <body>test</body>
        </message>`,
        {
            allowComments: true
        }
    );

    const msg = registry.import(messageXML) as Message;

    expect(msg).toBeTruthy();
    expect(msg.body).toBe('test');
});

test('[Parser] Prohibit Comments', () => {
    expect(() =>
        parse(
            `
            <message xmlns="jabber:client" id="123">
                <!-- More ignored -->
                <!-- <body>nope</body> -->
                <body>test</body>
            </message>`,
            {
                allowComments: false
            }
        )
    ).toThrow();
});

test('[Parser] Always prohibit DTDs', () => {
    expect(() =>
        parse(`
            <!DOCTYPE test SYSTEM "test.dtd">
            <message xmlns="jabber:client" id="123">
                <body>test</body>
            </message>`)
    ).toThrow();
});

test('[Parser] Always prohibit entity declarations', () => {
    expect(() =>
        parse(`
            <!ENTITY test SYSTEM "test.dtd">
            <message xmlns="jabber:client" id="123">
                <body>test</body>
            </message>`)
    ).toThrow();
});

test('[Parser] Prohibit processing instructions', () => {
    expect(() =>
        parse(`
            <?xml-stylesheet version="1.0"?>
            <message xmlns="jabber:client" id="123">
                <body>test</body>
            </message>`)
    ).toThrow();
});

test('[Parser] Allow XML declaration when prohibiting processing instructions', () => {
    const registry = setupRegistry();

    const messageXML = parse(`
        <?xml version="1.0"?>
        <message xmlns="jabber:client" id="123">
            <body>test</body>
        </message>`);

    const msg = registry.import(messageXML) as Message;

    expect(msg).toBeTruthy();
    expect(msg.body).toBe('test');
});

test('[Parser] Prohibit multiple XML declarations', () => {
    expect(() =>
        parse(`
            <?xml version="1.0"?>
            <?xml version="1.0"?>
            <message xmlns="jabber:client" id="123">
                <body>test</body>
            </message>`)
    ).toThrow();
});

test('[Parser] Always accept numeric escape entities', () => {
    const registry = setupRegistry();

    const messageXML = parse(`
        <message xmlns="jabber:client" id="123">
            <body>&#88;&#77;&#76;</body>
        </message>`);

    const msg = registry.import(messageXML) as Message;

    expect(msg).toBeTruthy();
    expect(msg.body).toBe('XML');
});

test('[Parser] Prohibit non-predefined entities', () => {
    expect(() =>
        parse(`
            <message xmlns="jabber:client" id="123">
                <body>test &foo;</body>
            </message>`)
    ).toThrow();
});

test('[Parser] Parse correctly even when insufficient data available for lookahead', () => {
    const registry = setupRegistry();
    const parser = new StreamParser({
        registry
    });

    parser.on('data', (data: ParsedData) => {
        expect(data.stanza).toEqual({
            body: 'test "body""body2"',
            id: '123',
            type: '"normal"'
        });
    });

    const inputData = `
        <?xml version="1.0" encoding="utf-8"?>
        <message xmlns="jabber:client" type="&quot;normal&quot;" id="123">
            <body>test &quot;body&quot;<![CDATA["body2"]]></body>
        </message>`;

    for (const char of inputData) {
        parser.write(char);
    }
});

test('[Parser] Attribute whitespace', () => {
    expect(() =>
        parse(`
            <message xmlns="jabber:client"   id   =     "123">
                <body>test</body>
            </message>`)
    ).not.toThrow();
});

test('[Parser] Attribute missing =', () => {
    expect(() =>
        parse(`
            <message xmlns="jabber:client" id "x">
                <body>test</body>
            </message>`)
    ).toThrow();
});

test('[Parser] Attribute multiple =', () => {
    expect(() =>
        parse(`
            <message xmlns="jabber:client" id=="x">
                <body>test</body>
            </message>`)
    ).toThrow();
});

test('[Parser] Prohibit unknown entity in attribute', () => {
    expect(() =>
        parse(`
            <message xmlns="jabber:client" id="&foo;">
                <body>test</body>
            </message>`)
    ).toThrow();
});

test('[Parser] Prohibit multiple attributes with same name', () => {
    expect(() =>
        parse(`
            <message xmlns="jabber:client" id="1" id="2">
                <body>test</body>
            </message>`)
    ).toThrow();
});
