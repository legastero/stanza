import expect from 'expect';

import { JID } from '../src';

// tslint:disable no-identical-functions no-duplicate-string

// --------------------------------------------------------------------
// Test basic parsing
// --------------------------------------------------------------------

test('Parse JID with only domain', () => {
    const res = JID.parse('example.com');
    expect(res.local).toBe('');
    expect(res.resource).toBe('');
    expect(res.bare).toBe('example.com');
    expect(res.full).toBe('example.com');
});

test('Parse JID with domain + resource', () => {
    const res = JID.parse('example.com/resource');
    expect(res.domain).toBe('example.com');
    expect(res.local).toBe('');
    expect(res.resource).toBe('resource');
    expect(res.bare).toBe('example.com');
    expect(res.full).toBe('example.com/resource');
});

test('Parse JID with local + domain', () => {
    const res = JID.parse('local@example.com');
    expect(res.domain).toBe('example.com');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('');
    expect(res.bare).toBe('local@example.com');
    expect(res.full).toBe('local@example.com');
});

test('Parse JID with local + domain + resource', () => {
    const res = JID.parse('local@example.com/resource');
    expect(res.domain).toBe('example.com');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('resource');
    expect(res.bare).toBe('local@example.com');
    expect(res.full).toBe('local@example.com/resource');
});

test('Parse JID with resource including @', () => {
    const res = JID.parse('local@example.com/res@ource');
    expect(res.domain).toBe('example.com');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('res@ource');
    expect(res.bare).toBe('local@example.com');
    expect(res.full).toBe('local@example.com/res@ource');
});

test('Parse JID with resource including /', () => {
    const res = JID.parse('local@example.com/resource/2');
    expect(res.domain).toBe('example.com');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('resource/2');
    expect(res.bare).toBe('local@example.com');
    expect(res.full).toBe('local@example.com/resource/2');
});

// --------------------------------------------------------------------
// Test constructing from JID components
// --------------------------------------------------------------------

test('Construct JID with only domain', () => {
    const res = JID.parse(JID.create({ domain: 'example.com' }));
    expect(res.domain).toBe('example.com');
    expect(res.bare).toBe('example.com');
    expect(res.full).toBe('example.com');
});

test('Construct JID with domain + resource', () => {
    const res = JID.parse(JID.create({ domain: 'example.com', resource: 'resource' }));
    expect(res.domain).toBe('example.com');
    expect(res.resource).toBe('resource');
    expect(res.bare).toBe('example.com');
    expect(res.full).toBe('example.com/resource');
});

test('Construct JID with local + domain', () => {
    const res = JID.parse(JID.create({ local: 'local', domain: 'example.com' }));
    expect(res.domain).toBe('example.com');
    expect(res.local).toBe('local');
    expect(res.bare).toBe('local@example.com');
    expect(res.full).toBe('local@example.com');
});

test('Construct JID with local + domain + resource', () => {
    const res = JID.parse(
        JID.create({ local: 'local', domain: 'example.com', resource: 'resource' })
    );
    expect(res.domain).toBe('example.com');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('resource');
    expect(res.bare).toBe('local@example.com');
    expect(res.full).toBe('local@example.com/resource');
});

test('Construct JID with resource including @', () => {
    const res = JID.parse(
        JID.create({ local: 'local', domain: 'example.com', resource: 'res@ource' })
    );
    expect(res.domain).toBe('example.com');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('res@ource');
    expect(res.bare).toBe('local@example.com');
    expect(res.full).toBe('local@example.com/res@ource');
});

test('Construct JID with resource including /', () => {
    const res = JID.parse(
        JID.create({ local: 'local', domain: 'example.com', resource: 'resource/2' })
    );
    expect(res.domain).toBe('example.com');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('resource/2');
    expect(res.bare).toBe('local@example.com');
    expect(res.full).toBe('local@example.com/resource/2');
});

// --------------------------------------------------------------------
// Test edge case valid forms
// --------------------------------------------------------------------

test('Valid: IPv4 domain', () => {
    const res = JID.parse('local@127.0.0.1/resource');
    expect(res.domain).toBe('127.0.0.1');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('resource');
    expect(res.bare).toBe('local@127.0.0.1');
    expect(res.full).toBe('local@127.0.0.1/resource');
});

test('Valid: IPv6 domain', () => {
    const res = JID.parse('local@[::1]/resource');
    expect(res.domain).toBe('[::1]');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('resource');
    expect(res.bare).toBe('local@[::1]');
    expect(res.full).toBe('local@[::1]/resource');
});

test('Valid: ACE domain', () => {
    const res = JID.parse('local@xn--bcher-kva.ch/resource');
    expect(res.domain).toBe('bücher.ch');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('resource');
    expect(res.bare).toBe('local@bücher.ch');
    expect(res.full).toBe('local@bücher.ch/resource');
});

test('Valid: domain includes trailing .', () => {
    const res = JID.parse('local@example.com./resource');
    expect(res.domain).toBe('example.com');
    expect(res.local).toBe('local');
    expect(res.resource).toBe('resource');
    expect(res.bare).toBe('local@example.com');
    expect(res.full).toBe('local@example.com/resource');
});

// --------------------------------------------------------------------
// Test JID prepping
// --------------------------------------------------------------------

test('Prep: Lowercase', () => {
    const res = JID.parse('LOCAL@EXAMPLE.com/RESOURCE');
    expect(res.local).toBe('local');
    expect(res.domain).toBe('example.com');
    expect(res.resource).toBe('RESOURCE');
    expect(res.bare).toBe('local@example.com');
    expect(res.full).toBe('local@example.com/RESOURCE');
});

// --------------------------------------------------------------------
// Test escaping/unescaping
// --------------------------------------------------------------------

test('Escape: No starting/ending \\20', () => {
    const res = JID.parse(JID.create({ local: ' test ', domain: 'example.com' }));
    expect(res.local).toBe('test');
});

test('Escape: Existing escape sequences', () => {
    const res = JID.parse(
        JID.create({ local: 'test\\20\\22\\26\\27\\2f\\3a\\3c\\3e\\40', domain: 'example.com' })
    );
    expect(res.local).toBe('test\\20\\22\\26\\27\\2f\\3a\\3c\\3e\\40');
    expect(res.bare).toBe('test\\5c20\\5c22\\5c26\\5c27\\5c2f\\5c3a\\5c3c\\5c3e\\5c40@example.com');
});

test('Escape: Existing escape sequence \\5c', () => {
    const res = JID.parse(JID.create({ local: 'test\\5c', domain: 'example.com' }));
    expect(res.local).toBe('test\\5c');
    expect(res.bare).toBe('test\\5c5c@example.com');
});

test('Escape: Non-escape sequence \\32\\', () => {
    const res = JID.parse(JID.create({ local: 'test\\32\\', domain: 'example.com' }));
    expect(res.local).toBe('test\\32\\');
    expect(res.bare).toBe('test\\32\\@example.com');
});

test('Escape: Escaped characters', () => {
    const res = JID.parse(JID.create({ local: 'testing @\\\'"?:&<>', domain: 'example.com' }));
    expect(res.bare).toBe('testing\\20\\40\\\\27\\22?\\3a\\26\\3c\\3e@example.com');
    expect(res.local).toBe('testing @\\\'"?:&<>');
});

test('Unescape: Non-escape sequence', () => {
    const res = JID.parse('test\\32@example.com');
    expect(res.local).toBe('test\\32');
    expect(res.bare).toBe('test\\32@example.com');
});

test('Unescape: Escaped characters', () => {
    const res = JID.parse('testing\\20\\40\\5c\\27\\22?\\3a\\26\\3c\\3e@example.com');
    expect(res.bare).toBe('testing\\20\\40\\5c\\27\\22?\\3a\\26\\3c\\3e@example.com');
    expect(res.local).toBe('testing @\\\'"?:&<>');
});

// --------------------------------------------------------------------
// Test equality
// --------------------------------------------------------------------

test('Equal: Full JID', () => {
    const jid1 = 'local@example.com/resource';
    const jid2 = 'LOcAL@EXample.COM/resource';
    expect(JID.equal(jid1, jid2)).toBeTruthy();
});

test('Equal: Bare JID', () => {
    const jid1 = 'local@example.com/resource1';
    const jid2 = 'LOcAL@EXample.COM/resource2';
    expect(JID.equalBare(jid1, jid2)).toBeTruthy();
});

// --------------------------------------------------------------------
// Test JID utilities
// --------------------------------------------------------------------

test('isBare', () => {
    const jid1 = 'local@example.com';
    const jid2 = 'local@example.com/resource';

    expect(JID.isBare(jid1)).toBeTruthy();
    expect(JID.isBare(jid2)).toBeFalsy();
});

test('isFull', () => {
    const jid1 = 'local@example.com/resource';
    const jid2 = 'local@example.com';

    expect(JID.isFull(jid1)).toBeTruthy();
    expect(JID.isFull(jid2)).toBeFalsy();
});

// --------------------------------------------------------------------
// Test URIs
// --------------------------------------------------------------------

test('Wrong protocol', () => {
    expect(() => JID.parseURI('https://example.com')).toThrow();
});

test('JID only', () => {
    const res = JID.parseURI('xmpp:user@example.com');
    expect(res.jid).toBe('user@example.com');
});

test('JID with resource', () => {
    const res = JID.parseURI('xmpp:user@example.com/resource');
    expect(res.jid).toBe('user@example.com/resource');
});

test('JID with only domain', () => {
    const res = JID.parseURI('xmpp:example.com');
    expect(res.jid).toBe('example.com');
});

test('JID with domain and resource', () => {
    const res = JID.parseURI('xmpp:example.com/resource');
    expect(res.jid).toBe('example.com/resource');
});

test('URI with query command, no parameters', () => {
    const res = JID.parseURI('xmpp:user@example.com/resource?message');
    expect(res.jid).toBe('user@example.com/resource');
    expect(res.action).toBe('message');
});

test('URI with query and parameters', () => {
    const res = JID.parseURI('xmpp:user@example.com/resource?message;body=test;subject=weeeee');
    expect(res.jid).toBe('user@example.com/resource');
    expect(res.action).toBe('message');
    expect(res.parameters).toEqual({
        body: 'test',
        subject: 'weeeee'
    });
});

test('URI with encoded parameter values', () => {
    const res = JID.parseURI(
        'xmpp:user@example.com/resource?message;body=test%20using%20%3d%20and%20%3b;subject=weeeee'
    );
    expect(res.jid).toBe('user@example.com/resource');
    expect(res.action).toBe('message');
    expect(res.parameters).toEqual({
        body: 'test using = and ;',
        subject: 'weeeee'
    });
});

test('Account selection only', () => {
    const res = JID.parseURI('xmpp://me@example.com');
    expect(res.identity).toBe('me@example.com');
});

test('Account selection with JID', () => {
    const res = JID.parseURI('xmpp://me@example.com/user@example.com');
    expect(res.identity).toBe('me@example.com');
    expect(res.jid).toBe('user@example.com');
});

test('Account selection with JID with resource', () => {
    const res = JID.parseURI('xmpp://me@example.com/user@example.com/resource');
    expect(res.identity).toBe('me@example.com');
    expect(res.jid).toBe('user@example.com/resource');
});

test('Account selection with full JID and query action with parameters', () => {
    const res = JID.parseURI(
        'xmpp://me@example.com/user@example.com/resource?message;body=kitchen%20sink;subject=allthethings'
    );
    expect(res.identity).toBe('me@example.com');
    expect(res.jid).toBe('user@example.com/resource');
    expect(res.action).toBe('message');
    expect(res.parameters).toEqual({
        body: 'kitchen sink',
        subject: 'allthethings'
    });
});

test('Create URI with just account', () => {
    const res = JID.toURI({
        identity: 'me@example.com'
    });
    expect(res).toBe('xmpp://me@example.com');
});

test('Create URI with just JID', () => {
    const res = JID.toURI({
        jid: 'user@example.com'
    });
    expect(res).toBe('xmpp:user@example.com');
});

test('Create URI with just JID and resource', () => {
    const res = JID.toURI({
        jid: 'user@example.com/@resource='
    });
    expect(res).toBe('xmpp:user@example.com/%40resource%3D');
});

test('Create URI with just JID and query action', () => {
    const res = JID.toURI({
        action: 'subscribe',
        jid: 'user@example.com/@resource='
    });
    expect(res).toBe('xmpp:user@example.com/%40resource%3D?subscribe');
});

test('Create URI with JID and query action with parameters', () => {
    const res = JID.toURI({
        action: 'message',
        jid: 'user@example.com/@?resource=',
        parameters: {
            body: 'testing',
            thread: 'thread-id'
        }
    });
    expect(res).toBe(
        'xmpp:user@example.com/%40%3Fresource%3D?message;body=testing;thread=thread-id'
    );
});

test('Create URI with selected account and query with parameters', () => {
    const res = JID.toURI({
        action: 'message',
        identity: 'me@example.com',
        jid: 'user@example.com/@?resource=',
        parameters: {
            body: 'testing',
            thread: 'thread-id'
        }
    });
    expect(res).toBe(
        'xmpp://me@example.com/user@example.com/%40%3Fresource%3D?message;body=testing;thread=thread-id'
    );
});

test('Nasty examples from RFC', () => {
    const res = JID.toURI({
        action: 'message',
        jid:
            'nasty!#$%()*+,-.;=?[\\]^_`{|}~node@example.com/repulsive !#"$%&\'()*+,-./:;<=>?@[\\]^_`{|}~resource'
    });
    expect(res).toBe(
        "xmpp:nasty!%23%24%25()*%2B%2C-.%3B%3D%3F%5B%5C%5D%5E_%60%7B%7C%7D~node@example.com/repulsive%20!%23%22%24%25%26'()*%2B%2C-.%2F%3A%3B%3C%3D%3E%3F%40%5B%5C%5D%5E_%60%7B%7C%7D~resource?message"
    );

    const res2 = JID.parseURI(res);
    expect(res2.jid).toBe(
        'nasty!#$%()*+,-.;=?[\\]^_`{|}~node@example.com/repulsive !#"$%&\'()*+,-./:;<=>?@[\\]^_`{|}~resource'
    );
});
