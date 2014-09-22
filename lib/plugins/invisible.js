'use strict';



module.exports = function (client, stanzas) {
    stanzas.use(require('../stanza/visibility'));

    client.goInvisible = function (cb) {
        return this.sendIq({
            type: 'set',
            invisible: true
        }, cb);
    };

    client.goVisible = function (cb) {
        return this.sendIq({
            type: 'set',
            visible: true
        }, cb);
    };
};
