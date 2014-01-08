"use strict";

var stanzas = require('../stanza/bookmarks');

module.exports = function (client) {
    client.getBookmarks = function (cb) {
        return this.getPrivateData({bookmarks: {}}, cb);
    };

    client.setBookmarks = function (opts, cb) {
        return this.setPrivateData({bookmarks: opts}, cb);
    };
};
