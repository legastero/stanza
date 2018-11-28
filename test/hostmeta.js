import test from 'tape';
import jxt from 'jxt';

import { getHostMeta } from '../src/plugins/hostmeta';
import XRD from '../src/protocol/stanzas/xrd';

const JXT = jxt.createRegistry();

const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0"' +
    '     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    '  <Subject>http://blog.example.com/article/id/314</Subject>' +
    '  <Expires>2010-01-30T09:30:00Z</Expires>' +
    '  <Alias>http://blog.example.com/cool_new_thing</Alias>' +
    '  <Alias>http://blog.example.com/steve/article/7</Alias>' +
    '  <Property type="http://blgx.example.net/ns/version">1.2</Property>' +
    '  <Property type="http://blgx.example.net/ns/version">1.3</Property>' +
    '  <Property type="http://blgx.example.net/ns/ext" xsi:nil="true" />' +
    '  <Link rel="author" type="text/html"' +
    '        href="http://blog.example.com/author/steve">' +
    '    <Title>About the Author</Title>' +
    '    <Title xml:lang="en-us">Author Information</Title>' +
    '    <Property type="http://example.com/role">editor</Property>' +
    '  </Link>' +
    '  <Link rel="author" href="http://example.com/author/john">' +
    '    <Title>The other guy</Title>' +
    '    <Title>The other author</Title>' +
    '  </Link>' +
    '</XRD>';

const json = {
    aliases: ['http://blog.example.com/cool_new_thing', 'http://blog.example.com/steve/article/7'],
    expires: '2010-01-30T09:30:00.000Z',
    links: [
        {
            href: 'http://blog.example.com/author/steve',
            properties: {
                'http://example.com/role': 'editor'
            },
            rel: 'author',
            titles: {
                default: 'About the Author',
                'en-us': 'Author Information'
            },
            type: 'text/html'
        },
        {
            href: 'http://example.com/author/john',
            rel: 'author',
            titles: {
                default: 'The other author'
            }
        }
    ],
    properties: {
        'http://blgx.example.net/ns/ext': '',
        'http://blgx.example.net/ns/version': '1.3'
    },
    subject: 'http://blog.example.com/article/id/314'
};

test('XRD', function(t) {
    t.plan(4);

    JXT.use(XRD);

    const xrd = JXT.parse(xml).toJSON();

    t.equal(xrd.subject, json.subject);
    t.deepEqual(xrd.expires, new Date(json.expires));
    t.deepEqual(xrd.properties, json.properties);
    t.deepEqual(xrd.links, json.links);
    t.end();
});

test('retrieve JSON only', function(t) {
    t.plan(2);

    getHostMeta(
        JXT,
        {
            host: 'lance.im',
            json: true,
            xrd: false
        },
        function(err, hostmeta) {
            t.notOk(err);
            t.ok(hostmeta.links.length > 0);
            t.end();
        }
    );
});

test('retrieve XRD only', function(t) {
    t.plan(2);

    getHostMeta(
        JXT,
        {
            host: 'lance.im',
            json: false,
            xrd: true
        },
        function(err, hostmeta) {
            t.notOk(err);
            t.ok(hostmeta.links.length > 0);
            t.end();
        }
    );
});

test('retrieve either', function(t) {
    getHostMeta(JXT, 'lance.im', function(err, hostmeta) {
        t.ok(hostmeta.links.length > 0);
        t.end();
    });
});

test('missing host-meta', function(t) {
    getHostMeta(
        JXT,
        {
            host: 'dne.lance.im',
            json: true,
            xrd: true
        },
        function(err) {
            t.equal(err, 'no-host-meta');
            t.end();
        }
    );
});
