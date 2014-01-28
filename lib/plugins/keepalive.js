"use strict";

var Promise = require('bluebird');


function checkConnection(client, timeout) {
    return new Promise(function (resolve, reject) {
        if (client.sm.started) {
            client.once('stream:management:ack', resolve);
            client.sm.request();
        } else {
            client.ping().then(resolve).catch(function (err) {
                if (err.error && err.error.condition !== 'timeout') {
                    resolve();
                } else {
                    reject();
                }
            });
        }
    }).timeout(timeout * 1000 || 15000);
}


module.exports = function (client) {
    client.enableKeepAlive = function (opts) {
        opts = opts || {
            timeout: 15,
            interval: 300
        };

        function keepalive() {
            if (client.sessionStarted) {
                checkConnection(client, opts.timeout).catch(function () {
                    client.sendStreamError({
                        condition: 'connection-timeout'
                    });
                });
            }
        }

        client._keepAliveInterval = setInterval(keepalive, opts.interval * 1000);
    };

    client.disableKeepAlive = function () {
        if (client._keepAliveInterval) {
            clearInterval(client._keepAliveInterval);
            delete client._keepAliveInterval;
        }
    };

    client.on('disconnected', function () {
        client.disableKeepAlive();
    });
};
