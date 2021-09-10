import expect from 'expect';
import { attribute, childText, ParsedData, Registry, StreamParser } from '../../src/jxt';
import { JXTErrorCondition } from '../../src/jxt/Error';

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

    registry.define({
        element: 'stream',
        namespace: 'http://etherx.jabber.org/streams',
        path: 'stream'
    });

    return registry;
}

test('[Streams] Unwrapped streams', done => {
    expect.assertions(2);

    const registry = setupRegistry();
    const parser = new StreamParser({
        registry
    });

    parser.on('data', (data: ParsedData) => {
        expect(data.kind).toBe('message');
        const msg = data.stanza as Message;
        expect(msg.body).toBe('test');
        done();
    });

    parser.write('<message xmlns="jabber:client" type="normal" id="123">');
    parser.write('<body>test</body>');
    parser.write('</message>');
});

test('[Streams] Wrapped streams', done => {
    expect.assertions(4);

    const registry = setupRegistry();
    const parser = new StreamParser({
        registry,
        rootKey: 'stream',
        wrappedStream: true
    });

    parser.on('data', (data: ParsedData) => {
        if (data.event === 'stream-start') {
            expect(data.kind).toBe('stream');
        }
        if (data.event === 'stream-end') {
            expect(data.kind).toBe('stream');
            done();
        }
        if (!data.event) {
            expect(data.kind).toBe('message');
            const msg = data.stanza as Message;
            expect(msg.body).toBe('test');
        }
    });

    parser.write(
        '<stream:stream xmlns:stream="http://etherx.jabber.org/streams" xmlns="jabber:client">'
    );
    parser.write('<message type="normal" id="123">');
    parser.write('<body>test</body>');
    parser.write('</message>');
    parser.write('</stream:stream>');
});

test('[Stream Errors] Unknown Root', done => {
    expect.assertions(2);

    const registry = setupRegistry();
    const parser = new StreamParser({
        registry,
        rootKey: 'stream',
        wrappedStream: true
    });

    parser.on('error', err => {
        expect(err.isJXTError).toBeTruthy();
        expect(err.condition).toBe(JXTErrorCondition.UnknownRoot);
        done();
    });

    parser.write('<message xmlns="jabber:client" type="normal" id="123"><body>');
});

test('[Stream Errors] Not well-formed', done => {
    expect.assertions(2);

    const registry = setupRegistry();
    const parser = new StreamParser({
        registry
    });

    parser.on('error', err => {
        expect(err.isJXTError).toBeTruthy();
        expect(err.condition).toBe(JXTErrorCondition.NotWellFormed);
        done();
    });

    parser.write('<message xmlns="jabber:client" type="normal" id="123">');
    parser.write('</presence>');
});

test('[Stream Errors] Not well-formed: close unopened stream', done => {
    expect.assertions(2);

    const registry = setupRegistry();
    const parser = new StreamParser({
        registry,
        rootKey: 'stream',
        wrappedStream: true
    });

    parser.on('error', err => {
        expect(err.isJXTError).toBeTruthy();
        expect(err.condition).toBe(JXTErrorCondition.NotWellFormed);
        done();
    });

    parser.write('</stream:stream>');
});

test('[Stream Errors] Already closed', done => {
    expect.assertions(2);

    const registry = setupRegistry();
    const parser = new StreamParser({
        registry,
        rootKey: 'stream',
        wrappedStream: true
    });

    parser.on('error', err => {
        expect(err.isJXTError).toBeTruthy();
        expect(err.condition).toBe(JXTErrorCondition.AlreadyClosed);
        done();
    });

    parser.write(
        '<stream:stream xmlns:stream="http://etherx.jabber.org/streams" xmlns="jabber:client">'
    );
    parser.write('</stream:stream><extra />');
});

test('[Stream Errors] Unknown root element', done => {
    expect.assertions(2);

    const registry = setupRegistry();
    const parser = new StreamParser({
        registry,
        wrappedStream: true
    });

    parser.on('error', err => {
        expect(err.isJXTError).toBeTruthy();
        expect(err.condition).toBe(JXTErrorCondition.NotWellFormed);
        done();
    });

    parser.write('<message />');
});

test('[Stream Errors] Unknown element', done => {
    const registry = setupRegistry();
    const parser = new StreamParser({
        registry
    });

    parser.on('error', () => {
        done.fail();
    });

    parser.write('<message />');
    done();
});

test('[Stream Errors] Restricted XML', done => {
    expect.assertions(2);

    const registry = setupRegistry();
    const parser = new StreamParser({
        allowComments: false,
        registry,
        wrappedStream: true
    });

    parser.on('error', err => {
        expect(err.isJXTError).toBeTruthy();
        expect(err.condition).toBe(JXTErrorCondition.RestrictedXML);
        done();
    });

    parser.write('<!-- illegal comment -->');
});
