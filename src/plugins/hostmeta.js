'use strict';

import * as async from 'async';
import request from 'request';

const NS = 'http://docs.oasis-open.org/ns/xri/xrd-1.0';


export function XRD(registry) {
    const jxt = registry.utils;

    const Properties = {
        get: function () {
            const results = {};
            const props = jxt.find(this.xml, NS, 'Property');
    
            for (let i = 0, len = props.length; i < len; i++) {
                const property = props[i];
                const type = jxt.getAttribute(property, 'type');
                results[type] = property.textContent;
            }
    
            return results;
        }
    };
    
    const XRD = registry.define({
        name: 'xrd',
        namespace: NS,
        element: 'XRD',
        fields: {
            subject: jxt.subText(NS, 'Subject'),
            expires: jxt.dateSub(NS, 'Expires'),
            aliases: jxt.multiSubText(NS, 'Alias'),
            properties: Properties
        }
    });
    
    
    const Link = registry.define({
        name: '_xrdlink',
        namespace: NS,
        element: 'Link',
        fields: {
            rel: jxt.attribute('rel'),
            href: jxt.attribute('href'),
            type: jxt.attribute('type'),
            template: jxt.attribute('template'),
            titles: jxt.subLangText(NS, 'Title', 'default'),
            properties: Properties
        }
    });
    
    registry.extend(XRD, Link, 'links');

    return XRD;
}


export function getHostMeta(JXT, opts, cb) {
    if (typeof opts === 'string') {
        opts = {host: opts};
    }

    const config = {
        ssl: true,
        json: true,
        xrd: true
    };

    for (const prop in opts) {
        config[prop] = opts[prop];
    }

    const scheme = config.ssl ? 'https://' : 'http://';

    async.parallel([
        function (done) {
            request(scheme + config.host + '/.well-known/host-meta.json', function (err, req, body) {
                if (err) {
                    return done(null);
                }

                let data;
                try {
                    data = JSON.parse(body);
                } catch (e) {
                    data = null;
                }
                return done(data);
            });
        },
        function (done) {
            request(scheme + config.host + '/.well-known/host-meta', function (err, req, body) {
                if (err) {
                    return done(null);
                }

                const xrd = JXT.parse(body);
                return done(xrd.toJSON());
            });
        }
    ], function (result) {
        if (result) {
            cb(null, result);
        } else {
            cb('no-host-meta');
        }
    });
}


export default function (client, stanzas) {

    if (!client && !stanzas) {
        return;
    }

    stanzas.use(XRD);

    client.discoverBindings = function (server, cb) {
        getHostMeta(stanzas, server, function (err, data) {
            if (err) {
                return cb(err, []);
            }
    
            const results = {
                websocket: [],
                bosh: []
            };
            const links = data.links || [];
    
            links.forEach(function (link) {
                if (link.href && link.rel === 'urn:xmpp:alt-connections:websocket') {
                    results.websocket.push(link.href);
                }
                if (link.href && link.rel === 'urn:xmpp:altconnect:websocket') {
                    results.websocket.push(link.href);
                }
                if (link.href && link.rel === 'urn:xmpp:alt-connections:xbosh') {
                    results.bosh.push(link.href);
                }
                if (link.href && link.rel === 'urn:xmpp:altconnect:bosh') {
                    results.bosh.push(link.href);
                }
            });
    
            cb(false, results);
        });
    };
}
