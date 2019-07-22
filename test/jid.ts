import test from 'tape';

import { JID } from '../src';

// tslint:disable no-identical-functions no-duplicate-string

// --------------------------------------------------------------------
// Test basic parsing
// --------------------------------------------------------------------

test('Parse JID with only domain', t => {
    const res = JID.parse('example.com');
    t.equal(res.local, '');
    t.equal(res.resource, '');
    t.equal(res.bare, 'example.com');
    t.equal(res.full, 'example.com');
    t.end();
});

test('Parse JID with domain + resource', t => {
    const res = JID.parse('example.com/resource');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, '');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'example.com');
    t.equal(res.full, 'example.com/resource');
    t.end();
});

test('Parse JID with local + domain', t => {
    const res = JID.parse('local@example.com');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, '');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com');
    t.end();
});

test('Parse JID with local + domain + resource', t => {
    const res = JID.parse('local@example.com/resource');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/resource');
    t.end();
});

test('Parse JID with resource including @', t => {
    const res = JID.parse('local@example.com/res@ource');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'res@ource');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/res@ource');
    t.end();
});

test('Parse JID with resource including /', t => {
    const res = JID.parse('local@example.com/resource/2');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource/2');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/resource/2');
    t.end();
});

// --------------------------------------------------------------------
// Test constructing from JID components
// --------------------------------------------------------------------

test('Construct JID with only domain', t => {
    const res = JID.parse(JID.create({ domain: 'example.com' }));
    t.equal(res.domain, 'example.com');
    t.equal(res.bare, 'example.com');
    t.equal(res.full, 'example.com');
    t.end();
});

test('Construct JID with domain + resource', t => {
    const res = JID.parse(JID.create({ domain: 'example.com', resource: 'resource' }));
    t.equal(res.domain, 'example.com');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'example.com');
    t.equal(res.full, 'example.com/resource');
    t.end();
});

test('Construct JID with local + domain', t => {
    const res = JID.parse(JID.create({ local: 'local', domain: 'example.com' }));
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com');
    t.end();
});

test('Construct JID with local + domain + resource', t => {
    const res = JID.parse(
        JID.create({ local: 'local', domain: 'example.com', resource: 'resource' })
    );
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/resource');
    t.end();
});

test('Construct JID with resource including @', t => {
    const res = JID.parse(
        JID.create({ local: 'local', domain: 'example.com', resource: 'res@ource' })
    );
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'res@ource');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/res@ource');
    t.end();
});

test('Construct JID with resource including /', t => {
    const res = JID.parse(
        JID.create({ local: 'local', domain: 'example.com', resource: 'resource/2' })
    );
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource/2');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/resource/2');
    t.end();
});

// --------------------------------------------------------------------
// Test edge case valid forms
// --------------------------------------------------------------------

test('Valid: IPv4 domain', t => {
    const res = JID.parse('local@127.0.0.1/resource');
    t.equal(res.domain, '127.0.0.1');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@127.0.0.1');
    t.equal(res.full, 'local@127.0.0.1/resource');
    t.end();
});

test('Valid: IPv6 domain', t => {
    const res = JID.parse('local@[::1]/resource');
    t.equal(res.domain, '[::1]');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@[::1]');
    t.equal(res.full, 'local@[::1]/resource');
    t.end();
});

test('Valid: ACE domain', t => {
    const res = JID.parse('local@xn--bcher-kva.ch/resource');
    t.equal(res.domain, 'bücher.ch');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@bücher.ch');
    t.equal(res.full, 'local@bücher.ch/resource');
    t.end();
});

test('Valid: domain includes trailing .', t => {
    const res = JID.parse('local@example.com./resource');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/resource');
    t.end();
});

// --------------------------------------------------------------------
// Test JID prepping
// --------------------------------------------------------------------

test('Prep: Lowercase', t => {
    const res = JID.parse('LOCAL@EXAMPLE.com/RESOURCE');
    t.equal(res.local, 'local');
    t.equal(res.domain, 'example.com');
    t.equal(res.resource, 'RESOURCE');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/RESOURCE');
    t.end();
});

// --------------------------------------------------------------------
// Test escaping/unescaping
// --------------------------------------------------------------------

test('Escape: No starting/ending \\20', t => {
    const res = JID.parse(JID.create({ local: ' test ', domain: 'example.com' }));
    t.equal(res.local, 'test');
    t.end();
});

test('Escape: Existing escape sequences', t => {
    const res = JID.parse(
        JID.create({ local: 'test\\20\\22\\26\\27\\2f\\3a\\3c\\3e\\40', domain: 'example.com' })
    );
    t.equal(res.local, 'test\\20\\22\\26\\27\\2f\\3a\\3c\\3e\\40');
    t.equal(res.bare, 'test\\5c20\\5c22\\5c26\\5c27\\5c2f\\5c3a\\5c3c\\5c3e\\5c40@example.com');
    t.end();
});

test('Escape: Existing escape sequence \\5c', t => {
    const res = JID.parse(JID.create({ local: 'test\\5c', domain: 'example.com' }));
    t.equal(res.local, 'test\\5c');
    t.equal(res.bare, 'test\\5c5c@example.com');
    t.end();
});

test('Escape: Non-escape sequence \\32\\', t => {
    const res = JID.parse(JID.create({ local: 'test\\32\\', domain: 'example.com' }));
    t.equal(res.local, 'test\\32\\');
    t.equal(res.bare, 'test\\32\\@example.com');
    t.end();
});

test('Escape: Escaped characters', t => {
    const res = JID.parse(JID.create({ local: 'testing @\\\'"?:&<>', domain: 'example.com' }));
    t.equal(res.bare, 'testing\\20\\40\\\\27\\22?\\3a\\26\\3c\\3e@example.com');
    t.equal(res.local, 'testing @\\\'"?:&<>');
    t.end();
});

test('Unescape: Non-escape sequence', t => {
    const res = JID.parse('test\\32@example.com');
    t.equal(res.local, 'test\\32');
    t.equal(res.bare, 'test\\32@example.com');
    t.end();
});

test('Unescape: Escaped characters', t => {
    const res = JID.parse('testing\\20\\40\\5c\\27\\22?\\3a\\26\\3c\\3e@example.com');
    t.equal(res.bare, 'testing\\20\\40\\5c\\27\\22?\\3a\\26\\3c\\3e@example.com');
    t.equal(res.local, 'testing @\\\'"?:&<>');
    t.end();
});

// --------------------------------------------------------------------
// Test equality
// --------------------------------------------------------------------

test('Equal: Full JID', t => {
    const jid1 = 'local@example.com/resource';
    const jid2 = 'LOcAL@EXample.COM/resource';
    t.ok(JID.equal(jid1, jid2));
    t.end();
});

test('Equal: Bare JID', t => {
    const jid1 = 'local@example.com/resource1';
    const jid2 = 'LOcAL@EXample.COM/resource2';
    t.ok(JID.equalBare(jid1, jid2));
    t.end();
});

// --------------------------------------------------------------------
// Test JID utilities
// --------------------------------------------------------------------

test('isBare', t => {
    const jid1 = 'local@example.com';
    const jid2 = 'local@example.com/resource';

    t.ok(JID.isBare(jid1));
    t.notOk(JID.isBare(jid2));
    t.end();
});

test('isFull', t => {
    const jid1 = 'local@example.com/resource';
    const jid2 = 'local@example.com';

    t.ok(JID.isFull(jid1));
    t.notOk(JID.isFull(jid2));
    t.end();
});

// --------------------------------------------------------------------
// Test URIs
// --------------------------------------------------------------------

test('Wrong protocol', t => {
    t.plan(1);
    try {
        JID.parseURI('https://example.com');
        t.fail('Did not throw error');
    } catch (err) {
        t.pass('Wrong protocol throws error');
    }
    t.end();
});

test('JID only', t => {
    const res = JID.parseURI('xmpp:user@example.com');
    t.equal(res.jid, 'user@example.com');
    t.end();
});

test('JID with resource', t => {
    const res = JID.parseURI('xmpp:user@example.com/resource');
    t.equal(res.jid, 'user@example.com/resource');
    t.end();
});

test('JID with only domain', t => {
    const res = JID.parseURI('xmpp:example.com');
    t.equal(res.jid, 'example.com');
    t.end();
});

test('JID with domain and resource', t => {
    const res = JID.parseURI('xmpp:example.com/resource');
    t.equal(res.jid, 'example.com/resource');
    t.end();
});

test('URI with query command, no parameters', t => {
    const res = JID.parseURI('xmpp:user@example.com/resource?message');
    t.equal(res.jid, 'user@example.com/resource');
    t.equal(res.action, 'message');
    t.end();
});

test('URI with query and parameters', t => {
    const res = JID.parseURI('xmpp:user@example.com/resource?message;body=test;subject=weeeee');
    t.equal(res.jid, 'user@example.com/resource');
    t.equal(res.action, 'message');
    t.same(res.parameters, {
        body: 'test',
        subject: 'weeeee'
    });
    t.end();
});

test('URI with encoded parameter values', t => {
    const res = JID.parseURI(
        'xmpp:user@example.com/resource?message;body=test%20using%20%3d%20and%20%3b;subject=weeeee'
    );
    t.equal(res.jid, 'user@example.com/resource');
    t.equal(res.action, 'message');
    t.same(res.parameters, {
        body: 'test using = and ;',
        subject: 'weeeee'
    });
    t.end();
});

test('Account selection only', t => {
    const res = JID.parseURI('xmpp://me@example.com');
    t.equal(res.identity, 'me@example.com');
    t.end();
});

test('Account selection with JID', t => {
    const res = JID.parseURI('xmpp://me@example.com/user@example.com');
    t.equal(res.identity, 'me@example.com');
    t.equal(res.jid, 'user@example.com');
    t.end();
});

test('Account selection with JID with resource', t => {
    const res = JID.parseURI('xmpp://me@example.com/user@example.com/resource');
    t.equal(res.identity, 'me@example.com');
    t.equal(res.jid, 'user@example.com/resource');
    t.end();
});

test('Account selection with full JID and query action with parameters', t => {
    const res = JID.parseURI(
        'xmpp://me@example.com/user@example.com/resource?message;body=kitchen%20sink;subject=allthethings'
    );
    t.equal(res.identity, 'me@example.com');
    t.equal(res.jid, 'user@example.com/resource');
    t.equal(res.action, 'message');
    t.same(res.parameters, {
        body: 'kitchen sink',
        subject: 'allthethings'
    });
    t.end();
});

test('Create URI with just account', t => {
    const res = JID.toURI({
        identity: 'me@example.com'
    });
    t.equal(res, 'xmpp://me@example.com');
    t.end();
});

test('Create URI with just JID', t => {
    const res = JID.toURI({
        jid: 'user@example.com'
    });
    t.equal(res, 'xmpp:user@example.com');
    t.end();
});

test('Create URI with just JID and resource', t => {
    const res = JID.toURI({
        jid: 'user@example.com/@resource='
    });
    t.equal(res, 'xmpp:user@example.com/%40resource%3D');
    t.end();
});

test('Create URI with just JID and query action', t => {
    const res = JID.toURI({
        action: 'subscribe',
        jid: 'user@example.com/@resource='
    });
    t.equal(res, 'xmpp:user@example.com/%40resource%3D?subscribe');
    t.end();
});

test('Create URI with JID and query action with parameters', t => {
    const res = JID.toURI({
        action: 'message',
        jid: 'user@example.com/@?resource=',
        parameters: {
            body: 'testing',
            thread: 'thread-id'
        }
    });
    t.equal(res, 'xmpp:user@example.com/%40%3Fresource%3D?message;body=testing;thread=thread-id');
    t.end();
});

test('Create URI with selected account and query with parameters', t => {
    const res = JID.toURI({
        action: 'message',
        identity: 'me@example.com',
        jid: 'user@example.com/@?resource=',
        parameters: {
            body: 'testing',
            thread: 'thread-id'
        }
    });
    t.equal(
        res,
        'xmpp://me@example.com/user@example.com/%40%3Fresource%3D?message;body=testing;thread=thread-id'
    );
    t.end();
});

test('Nasty examples from RFC', t => {
    const res = JID.toURI({
        action: 'message',
        jid:
            'nasty!#$%()*+,-.;=?[\\]^_`{|}~node@example.com/repulsive !#"$%&\'()*+,-./:;<=>?@[\\]^_`{|}~resource'
    });
    t.equal(
        res,
        "xmpp:nasty!%23%24%25()*%2B%2C-.%3B%3D%3F%5B%5C%5D%5E_%60%7B%7C%7D~node@example.com/repulsive%20!%23%22%24%25%26'()*%2B%2C-.%2F%3A%3B%3C%3D%3E%3F%40%5B%5C%5D%5E_%60%7B%7C%7D~resource?message"
    );

    const res2 = JID.parseURI(res);
    t.equal(
        res2.jid,
        'nasty!#$%()*+,-.;=?[\\]^_`{|}~node@example.com/repulsive !#"$%&\'()*+,-./:;<=>?@[\\]^_`{|}~resource'
    );
    t.end();
});
