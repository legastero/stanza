const test = require('tape');

import { jid as xmppjid, JID } from '../src';

// --------------------------------------------------------------------
// Test basic parsing
// --------------------------------------------------------------------

test('Parse JID with only domain', function(t) {
    var res = new JID('example.com');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, '');
    t.equal(res.resource, '');
    t.equal(res.bare, 'example.com');
    t.equal(res.full, 'example.com');
    t.end();
});

test('Parse JID with domain + resource', function(t) {
    var res = new JID('example.com/resource');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, '');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'example.com');
    t.equal(res.full, 'example.com/resource');
    t.end();
});

test('Parse JID with local + domain', function(t) {
    var res = new JID('local@example.com');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, '');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com');
    t.end();
});

test('Parse JID with local + domain + resource', function(t) {
    var res = new JID('local@example.com/resource');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/resource');
    t.end();
});

test('Parse JID with resource including @', function(t) {
    var res = new JID('local@example.com/res@ource');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'res@ource');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/res@ource');
    t.end();
});

test('Parse JID with resource including /', function(t) {
    var res = new JID('local@example.com/resource/2');
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

test('Construct JID with only domain', function(t) {
    var res = new JID('', 'example.com');
    t.equal(res.domain, 'example.com');
    t.equal(res.bare, 'example.com');
    t.equal(res.full, 'example.com');
    t.end();
});

test('Construct JID with domain + resource', function(t) {
    var res = new JID('', 'example.com', 'resource');
    t.equal(res.domain, 'example.com');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'example.com');
    t.equal(res.full, 'example.com/resource');
    t.end();
});

test('Construct JID with local + domain', function(t) {
    var res = new JID('local', 'example.com');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com');
    t.end();
});

test('Construct JID with local + domain + resource', function(t) {
    var res = new JID('local', 'example.com', 'resource');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/resource');
    t.end();
});

test('Construct JID with resource including @', function(t) {
    var res = new JID('local', 'example.com', 'res@ource');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'res@ource');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/res@ource');
    t.end();
});

test('Construct JID with resource including /', function(t) {
    var res = new JID('local', 'example.com', 'resource/2');
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

test('Valid: IPv4 domain', function(t) {
    var res = new JID('local@127.0.0.1/resource');
    t.equal(res.domain, '127.0.0.1');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@127.0.0.1');
    t.equal(res.full, 'local@127.0.0.1/resource');
    t.end();
});

test('Valid: IPv6 domain', function(t) {
    var res = new JID('local@[::1]/resource');
    t.equal(res.domain, '[::1]');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@[::1]');
    t.equal(res.full, 'local@[::1]/resource');
    t.end();
});

test('Valid: ACE domain', function(t) {
    var res = new JID('local@xn--bcher-kva.ch/resource');
    t.equal(res.domain, 'bücher.ch');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@bücher.ch');
    t.equal(res.full, 'local@bücher.ch/resource');
    t.end();
});

test('Valid: domain includes trailing .', function(t) {
    var res = new JID('local@example.com./resource');
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

test('Prep: Lowercase', function(t) {
    var res = new JID('LOCAL@EXAMPLE.com/RESOURCE');
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

test('Escape: No starting/ending \\20', function(t) {
    var res = new JID(' test ', 'example.com');
    t.equal(res.local, 'test');
    t.equal(res.unescapedLocal, 'test');
    t.end();
});

test('Escape: Existing escape sequences', function(t) {
    var res = new JID('test\\20\\22\\26\\27\\2f\\3a\\3c\\3e\\40', 'example.com');
    t.equal(res.local, 'test\\5c20\\5c22\\5c26\\5c27\\5c2f\\5c3a\\5c3c\\5c3e\\5c40');
    t.equal(res.bare, 'test\\5c20\\5c22\\5c26\\5c27\\5c2f\\5c3a\\5c3c\\5c3e\\5c40@example.com');
    t.equal(res.unescapedLocal, 'test\\20\\22\\26\\27\\2f\\3a\\3c\\3e\\40');
    t.end();
});

test('Escape: Existing escape sequence \\5c', function(t) {
    var res = new JID('test\\5c', 'example.com');
    t.equal(res.local, 'test\\5c5c');
    t.equal(res.bare, 'test\\5c5c@example.com');
    t.equal(res.unescapedLocal, 'test\\5c');
    t.end();
});

test('Escape: Non-escape sequence \\32\\', function(t) {
    var res = new JID('test\\32\\', 'example.com');
    t.equal(res.local, 'test\\32\\');
    t.equal(res.bare, 'test\\32\\@example.com');
    t.equal(res.unescapedLocal, 'test\\32\\');
    t.end();
});

test('Escape: Escaped characters', function(t) {
    var res = new JID('testing @\\\'"?:&<>', 'example.com');
    t.equal(res.local, 'testing\\20\\40\\\\27\\22?\\3a\\26\\3c\\3e');
    t.equal(res.bare, 'testing\\20\\40\\\\27\\22?\\3a\\26\\3c\\3e@example.com');
    t.equal(res.unescapedLocal, 'testing @\\\'"?:&<>');
    t.equal(res.unescapedBare, 'testing @\\\'"?:&<>@example.com');
    t.end();
});

test('Unescape: Non-escape sequence', function(t) {
    var res = new JID('test\\32@example.com');
    t.equal(res.local, 'test\\32');
    t.equal(res.bare, 'test\\32@example.com');
    t.equal(res.unescapedLocal, 'test\\32');
    t.end();
});

test('Unescape: Escaped characters', function(t) {
    var res = new JID('testing\\20\\40\\5c\\27\\22?\\3a\\26\\3c\\3e@example.com');
    t.equal(res.local, 'testing\\20\\40\\5c\\27\\22?\\3a\\26\\3c\\3e');
    t.equal(res.unescapedLocal, 'testing @\\\'"?:&<>');
    t.end();
});

// --------------------------------------------------------------------
// Test equality
// --------------------------------------------------------------------

test('Equal: Full JID', function(t) {
    var jid1 = new JID('local@example.com/resource');
    var jid2 = new JID('LOcAL@EXample.COM/resource');
    t.ok(xmppjid.equal(jid1, jid2));
    t.end();
});

test('Equal: Full JID, require prepping', function(t) {
    var jid1 = new JID('local@example.com/resource');
    var jid2 = new JID('LOcAL@EXample.COM/resource');

    jid1.prepped = true;
    jid2.prepped = false;

    t.notOk(xmppjid.equal(jid1, jid2, true));
    t.ok(xmppjid.equal(jid1, jid2, false));
    t.end();
});

test('Equal: Bare JID', function(t) {
    var jid1 = new JID('local@example.com/resource');
    var jid2 = new JID('LOcAL@EXample.COM/resource');
    t.ok(xmppjid.equalBare(jid1, jid2));
    t.end();
});

test('Equal: Bare JID, require prepping', function(t) {
    var jid1 = new JID('local@example.com/resource');
    var jid2 = new JID('LOcAL@EXample.COM/resource');

    jid1.prepped = true;
    jid2.prepped = false;

    t.notOk(xmppjid.equalBare(jid1, jid2, true));
    t.ok(xmppjid.equalBare(jid1, jid2, false));
    t.end();
});

// --------------------------------------------------------------------
// Test JID utilities
// --------------------------------------------------------------------

test('toString', function(t) {
    var res = new JID('local@example.com/resource');
    t.equal(res.toString(), 'local@example.com/resource');
    t.end();
});

test('JSON.stringify', function(t) {
    var res = new JID('local@example.com/resource');
    t.equal(JSON.stringify(res), '"local@example.com/resource"');
    t.end();
});

test('Create', function(t) {
    var res = xmppjid.create('local@example.com/resource');
    t.equal(res.domain, 'example.com');
    t.equal(res.local, 'local');
    t.equal(res.resource, 'resource');
    t.equal(res.bare, 'local@example.com');
    t.equal(res.full, 'local@example.com/resource');
    t.end();
});

test('Clone JID', function(t) {
    var orig = new JID('local@example.com/resource');
    var clone = new JID(orig);
    t.equal(orig.full, clone.full);
    t.equal(orig.bare, clone.bare);
    t.equal(orig.domain, clone.domain);
    t.equal(orig.local, clone.local);
    t.equal(orig.resource, clone.resource);
    t.end();
});

test('isBare', function(t) {
    var jid1 = new JID('local@example.com');
    var jid2 = new JID('local@example.com/resource');

    t.ok(xmppjid.isBare(jid1));
    t.notOk(xmppjid.isBare(jid2));
    t.end();
});

test('isFull', function(t) {
    var jid1 = new JID('local@example.com/resource');
    var jid2 = new JID('local@example.com');

    t.ok(xmppjid.isFull(jid1));
    t.notOk(xmppjid.isFull(jid2));
    t.end();
});

test('Invalid arguments', function(t) {
    t.throws(function() {
        const x = new JID(1234);
    });
    t.end();
});
