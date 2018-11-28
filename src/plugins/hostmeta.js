import * as async from 'async';
import request from 'request';

import { Namespaces } from '../protocol';

export function getHostMeta(JXT, opts, cb) {
    if (typeof opts === 'string') {
        opts = { host: opts };
    }

    const config = {
        json: true,
        ssl: true,
        xrd: true,
        ...opts
    };

    const scheme = config.ssl ? 'https://' : 'http://';

    async.parallel(
        [
            function(done) {
                request(scheme + config.host + '/.well-known/host-meta.json', function(
                    err,
                    req,
                    body
                ) {
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
            function(done) {
                request(scheme + config.host + '/.well-known/host-meta', function(err, req, body) {
                    if (err) {
                        return done(null);
                    }

                    const xrd = JXT.parse(body);
                    return done(xrd.toJSON());
                });
            }
        ],
        function(result) {
            if (result) {
                cb(null, result);
            } else {
                cb('no-host-meta');
            }
        }
    );
}

export default function(client, stanzas) {
    client.discoverBindings = function(server, cb) {
        getHostMeta(stanzas, server, function(err, data) {
            if (err) {
                return cb(err, []);
            }

            const results = {
                bosh: [],
                websocket: []
            };
            const links = data.links || [];

            for (const link of links) {
                if (link.href && link.rel === Namespaces.ALT_CONNECTIONS_WEBSOCKET) {
                    results.websocket.push(link.href);
                }
                if (link.href && link.rel === Namespaces.ALT_CONNECTIONS_XBOSH) {
                    results.bosh.push(link.href);
                }
            }

            cb(false, results);
        });
    };
}
