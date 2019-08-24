import test from 'tape';
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

export default function runTests() {
    test('[Escaping] Import with "', t => {
        const registry = setupRegistry();

        const messageXML = parse(`
            <message xmlns="jabber:client" type="&quot;normal&quot;" id="123">
              <body>test &quot;body&quot;</body>
            </message>`);

        const msg = registry.import(messageXML) as Message;

        t.ok(msg, 'Message exists');
        t.equal(msg.type, '"normal"', 'Message type includes "');
        t.equal(msg.body, 'test "body"', 'Message body includes "');
        t.end();
    });

    test('[Escaping] Export with "', t => {
        const registry = setupRegistry();

        const output = registry.export('message', {
            body: 'test "body"',
            id: '123',
            type: '"normal"'
        } as Message)!;

        const outputStr = output.toString();
        t.equal(
            outputStr,
            '<message xmlns="jabber:client" id="123" type="&quot;normal&quot;"><body>test "body"</body></message>'
        );

        const msg = registry.import(output) as Message;
        t.equal(msg.type, '"normal"', 'Message type includes "');
        t.equal(msg.body, 'test "body"', 'Message body includes "');
        t.end();
    });

    test('[Parser] Import CDATA', t => {
        const registry = setupRegistry();

        const messageXML = parse(`
            <message xmlns="jabber:client" type="&quot;normal&quot;" id="123">
              <body><![CDATA[test "<>"]]></body>
            </message>`);

        const msg = registry.import(messageXML) as Message;

        t.ok(msg, 'Message exists');
        t.equal(msg.type, '"normal"', 'Message type includes "');
        t.equal(msg.body, 'test "<>"', 'Message body includes "<>"');
        t.end();
    });

    test('[Parser] Ignore Comments', t => {
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

        t.ok(msg, 'Message exists');
        t.equal(msg.body, 'test', 'Message body includes "test"');
        t.end();
    });

    test('[Parser] Prohibit Comments', t => {
        try {
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
            );

            t.fail('Did not prohibit processing instruction');
        } catch (err) {
            t.pass('Prohibited processing instruction');
        }
        t.end();
    });

    test('[Parser] Always prohibit DTDs', t => {
        try {
            parse(`
                <!DOCTYPE test SYSTEM "test.dtd">
                <message xmlns="jabber:client" id="123">
                  <body>test</body>
                </message>`);

            t.fail('Did not prohibit doctype');
        } catch (err) {
            t.pass('Prohibited doctype');
        }
        t.end();
    });

    test('[Parser] Always prohibit entity declarations', t => {
        try {
            parse(`
                <!ENTITY test SYSTEM "test.dtd">
                <message xmlns="jabber:client" id="123">
                  <body>test</body>
                </message>`);

            t.fail('Did not prohibit entity declaration');
        } catch (err) {
            t.pass('Prohibited entity declaration');
        }
        t.end();
    });

    test('[Parser] Prohibit processing instructions', t => {
        try {
            parse(`
                <?xml-stylesheet version="1.0"?>
                <message xmlns="jabber:client" id="123">
                  <body>test</body>
                </message>`);

            t.fail('Did not prohibit processing instruction');
        } catch (err) {
            t.pass('Prohibited processing instruction');
        }
        t.end();
    });

    test('[Parser] Allow XML declaration when prohibiting processing instructions', t => {
        const registry = setupRegistry();

        const messageXML = parse(`
            <?xml version="1.0"?>
            <message xmlns="jabber:client" id="123">
              <body>test</body>
            </message>`);

        const msg = registry.import(messageXML) as Message;

        t.ok(msg, 'Message exists');
        t.equal(msg.body, 'test', 'Message body includes "test"');
        t.end();
    });

    test('[Parser] Prohibit multiple XML declarations', t => {
        try {
            parse(`
                <?xml version="1.0"?>
                <?xml version="1.0"?>
                <message xmlns="jabber:client" id="123">
                  <body>test</body>
                </message>`);

            t.fail('Did not prohibit multiple XML declarations');
        } catch (err) {
            t.pass('Prohibited multiple XML declarations');
        }
        t.end();
    });

    test('[Parser] Always accept numeric escape entities', t => {
        const registry = setupRegistry();

        const messageXML = parse(`
            <message xmlns="jabber:client" id="123">
              <body>&#88;&#77;&#76;</body>
            </message>`);

        const msg = registry.import(messageXML) as Message;

        t.ok(msg, 'Message exists');
        t.equal(msg.body, 'XML', 'Numeric character references applied');
        t.end();
    });

    test('[Parser] Prohibit non-predefined entities', t => {
        try {
            parse(`
                <message xmlns="jabber:client" id="123">
                  <body>test &foo;</body>
                </message>`);

            t.fail('Did not prohibit entity');
        } catch (err) {
            t.pass('Prohibit entity');
        }

        t.end();
    });

    test('[Parser] Parse correctly even when insufficient data available for lookahead', t => {
        const registry = setupRegistry();
        const parser = new StreamParser({
            registry
        });

        parser.on('data', (data: ParsedData) => {
            t.deepEqual(data.stanza, {
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

        t.end();
    });

    test('[Parser] Attribute whitespace', t => {
        try {
            parse(`
                <message xmlns="jabber:client"   id   =     "123">
                  <body>test</body>
                </message>`);
            t.pass();
        } catch (err) {
            t.fail(err);
        }

        t.end();
    });

    test('[Parser] Attribute missing =', t => {
        try {
            parse(`
                <message xmlns="jabber:client" id "x">
                  <body>test</body>
                </message>`);
        } catch (err) {
            t.ok(err);
        }

        t.end();
    });

    test('[Parser] Attribute multiple =', t => {
        try {
            parse(`
                <message xmlns="jabber:client" id=="x">
                  <body>test</body>
                </message>`);
        } catch (err) {
            t.ok(err);
        }

        t.end();
    });

    test('[Parser] Prohibit unknown entity in attribute', t => {
        try {
            parse(`
                <message xmlns="jabber:client" id="&foo;">
                  <body>test</body>
                </message>`);
            t.fail('Did not prohibit entity');
        } catch (err) {
            t.ok(err);
        }

        t.end();
    });

    test('[Parser] Prohibit multiple attributes with same name', t => {
        try {
            parse(`
                <message xmlns="jabber:client" id="1" id="2">
                  <body>test</body>
                </message>`);
            t.fail('Did not fail on multiple attributes with same name');
        } catch (err) {
            t.ok(err);
        }

        t.end();
    });
}
