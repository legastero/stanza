var stanzas = require('../stanza/bookmarks');


module.exports = function (client) {

    client.getBookmarks = function (cb) {
        this.getPrivateData({bookmarks: {}}, cb);
    };

    client.setBookmarks = function (opts, cb) {
        this.setPrivateData({bookmarks: opts}, cb);
    };

};
