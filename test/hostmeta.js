import test from 'tape';
import * as JXT from '../src/jxt';

import { getHostMeta } from '../src/plugins/hostmeta';
import XRD from '../src/protocol/stanzas/xrd';

const registry = new JXT.Registry();
registry.define(XRD);

const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0"' +
    '     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '  <Subject>http://blog.example.com/article/id/314</Subject>' +
    '  <Link rel="author" type="text/html"' +
    '        href="http://blog.example.com/author/steve" />' +
    '  <Link rel="author" href="http://example.com/author/john" />' +
    '</XRD>';

const json = {
    links: [
        {
            href: 'http://blog.example.com/author/steve',
            rel: 'author',
            type: 'text/html'
        },
        {
            href: 'http://example.com/author/john',
            rel: 'author'
        }
    ],
    subject: 'http://blog.example.com/article/id/314'
};

test('XRD', function(t) {
    t.plan(2);

    const xrd = registry.import(JXT.parse(xml));

    t.equal(xrd.subject, json.subject);
    t.deepEqual(xrd.links, json.links);
    t.end();
});

test('retrieve JSON only', function(t) {
    t.plan(1);

    getHostMeta(registry, {
        host: 'lance.im',
        json: true,
        xrd: false
    }).then(hostmeta => {
        t.ok(hostmeta.links.length > 0);
        t.end();
    });
});

test('retrieve XRD only', function(t) {
    t.plan(1);

    getHostMeta(registry, {
        host: 'lance.im',
        json: false,
        xrd: true
    }).then(hostmeta => {
        t.ok(hostmeta.links.length > 0);
        t.end();
    });
});

test('retrieve either', function(t) {
    t.plan(1);
    getHostMeta(registry, 'lance.im').then(hostmeta => {
        t.ok(hostmeta.links.length > 0);
        t.end();
    });
});

test('missing host-meta', function(t) {
    t.plan(1);
    getHostMeta(registry, {
        host: 'dne.lance.im',
        json: true,
        xrd: true
    }).catch(err => {
        t.ok(err);
        t.end();
    });
});
