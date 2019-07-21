import test from 'tape';

import { JID } from '../src';

// tslint:disable no-identical-functions no-duplicate-string

// --------------------------------------------------------------------
// Test basic parsing
// --------------------------------------------------------------------

test('Parse JID with only domain', t => {
    const res = JID.parse('example.com');
    t.equal(res.domain, 'example.com');
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
