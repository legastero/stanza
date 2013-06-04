require('../stanza/visibility');


exports.init = function (client) {
    client.goInvisible = function (cb) {
        this.sendIq({
            type: 'set',
            invisible: true
        });
    };

    client.goVisible = function (cb) {
        this.sendIq({
            type: 'set',
            visible: true
        });
    };
};
