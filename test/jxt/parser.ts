import expect from 'expect';

import * as JXT from '../../src/jxt';

test('Error', () => {
    expect(() => {
        JXT.parse('</error>');
    }).toThrow();
});

test('Error', () => {
    expect(() => {
        JXT.parse('<name></different-name>');
    }).toThrow();
});

test('End with data', () => {
    expect.assertions(1);

    const parser = new JXT.Parser();

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    parser.write('<test');
    parser.end('/>');
    parser.write('<ignored />');
});

test('Empty CDATA', () => {
    const xml = JXT.parse('<foo><![CDATA[]]></foo>');
    expect(xml.children[0]).toBe(undefined);
});

test('Wait for declaration', () => {
    expect.assertions(1);

    const parser = new JXT.Parser();

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    parser.write('<?');
    parser.write("xml version='1.0'?><test />");
    parser.end();
});

test('Wait for declaration', () => {
    expect.assertions(1);

    const parser = new JXT.Parser();

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    parser.write('<?x');
    parser.write("ml version='1.0'?><test />");
    parser.end();
});

test('Wait for declaration', () => {
    expect.assertions(1);

    const parser = new JXT.Parser();

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    parser.write('<?xm');
    parser.write("l version='1.0'?><test />");
    parser.end();
});

test('Wait for declaration', () => {
    expect.assertions(1);

    const parser = new JXT.Parser();

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    parser.write('<?xml');
    parser.write(" version='1.0'?><test />");
    parser.end();
});

test('Wait for comment', () => {
    expect.assertions(1);

    const parser = new JXT.Parser({
        allowComments: true
    });

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    try {
        parser.write('<!');
        parser.write('-- --><test />');
        parser.end();
    } catch (err) {
        console.error(err);
    }
});

test('Wait for comment', () => {
    expect.assertions(1);

    const parser = new JXT.Parser({
        allowComments: true
    });

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    parser.write('<!-');
    parser.write('- --><test />');
    parser.end();
});

test('Wait for comment', () => {
    expect.assertions(1);

    const parser = new JXT.Parser({
        allowComments: true
    });

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    parser.write('<!--');
    parser.write(' --><test />');
    parser.end();
});

test('Wait for comment', () => {
    expect.assertions(1);

    const parser = new JXT.Parser({
        allowComments: true
    });

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    parser.write('<!--');
    parser.write(' --><test />');
    parser.end();
});

test('[Parser] Invalid tag name', () => {
    expect(() => JXT.parse(`<0 />`)).toThrow();
});

test('[Parser] Invalid tag name', () => {
    expect(() => JXT.parse(`<a</>`)).toThrow();
});

test('[Parser] Invalid self closing tag', () => {
    expect(() => JXT.parse(`<a / >`)).toThrow();
});

test('[Parser] Invalid closing tag whitespace', () => {
    expect(() => JXT.parse(`<a>< /a>`)).toThrow();
});

test('[Parser] Invalid closing tag whitespace', () => {
    expect(() => JXT.parse(`<a></ a>`)).toThrow();
});

test('[Parser] Invalid closing tag additional names', () => {
    expect(() => JXT.parse(`<a></a  x>`)).toThrow();
});

test('[Parser] Invalid closing tag additional data', () => {
    expect(() => JXT.parse(`<a></a/>`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a<`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a <`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  <`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  b<`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  b <`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  b  <`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  b  =<`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  b  = <`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  b  =  <`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  b  =  "<`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  b  =  '<`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  b  =  ""<`)).toThrow();
});

test('[Parser] Invalid end of open tag', () => {
    expect(() => JXT.parse(`<a  b  =  ''<`)).toThrow();
});

test('[Parser] Invalid attribute name', () => {
    expect(() => JXT.parse(`<a 0="1"/>`)).toThrow();
});

test('', () => {
    expect.assertions(1);

    const parser = new JXT.Parser();

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    parser.write('<test></test   >');
});

test('', () => {
    expect.assertions(1);

    const parser = new JXT.Parser();

    parser.on('endElement', (name: string) => {
        expect(name).toBe('test');
    });

    parser.write("<test a='1' ></test>");
});

test('Parser standalone attributes not allowed', () => {
    expect(() => JXT.parse(`<test a/>`)).toThrow();
});

test('Parser standalone attributes not allowed', () => {
    expect(() => JXT.parse(`<test a></test>`)).toThrow();
});

test('Parser standalone attributes not allowed', () => {
    expect(() => JXT.parse(`<test a />`)).toThrow();
});

test('Parser standalone attributes not allowed', () => {
    expect(() => JXT.parse(`<test a ></test>`)).toThrow();
});

test('XML declaration must end with ?>', () => {
    expect(() => JXT.parse(`<?xml ? >`)).toThrow();
});

test('Declaration not starting with "xml " is prohibited', () => {
    expect(() => JXT.parse(`<?x1 ?>`)).toThrow();
});
test('Declaration not starting with "xml " is prohibited', () => {
    expect(() => JXT.parse(`<?xm1 ?>`)).toThrow();
});
test('Declaration not starting with "xml " is prohibited', () => {
    expect(() => JXT.parse(`<?xml1 ?>`)).toThrow();
});

test('CDATA must start with "[CDATA["', () => {
    expect(() => JXT.parse(`<test><![CDATA</test>`)).toThrow();
});

test('CDATA must start with "[CDATA["', () => {
    expect(() => JXT.parse(`<test><![CDAT</test>`)).toThrow();
});

test('CDATA must start with "[CDATA["', () => {
    expect(() => JXT.parse(`<test><![CDA</test>`)).toThrow();
});

test('CDATA must start with "[CDATA["', () => {
    expect(() => JXT.parse(`<test><![CD</test>`)).toThrow();
});

test('CDATA must start with "[CDATA["', () => {
    expect(() => JXT.parse(`<test><![C</test>`)).toThrow();
});

test('CDATA must start with "[CDATA["', () => {
    expect(() => JXT.parse(`<test><![</test>`)).toThrow();
});
