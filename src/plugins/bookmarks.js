import { JID } from 'xmpp-jid';

const extend = require('lodash.assign');
const filter = require('lodash.filter');

export default function(client) {
    client.getBookmarks = function(cb) {
        return this.getPrivateData({ bookmarks: true }, cb);
    };

    client.setBookmarks = function(opts, cb) {
        return this.setPrivateData({ bookmarks: opts }, cb);
    };

    client.addBookmark = function(bookmark, cb) {
        bookmark.jid = new JID(bookmark.jid);

        return this.getBookmarks()
            .then(function(res) {
                const bookmarks = res.privateStorage.bookmarks.conferences || [];
                const existing = filter(bookmarks, function(bm) {
                    return bm.jid.bare === bookmark.jid.bare;
                });

                if (existing.length) {
                    extend(existing[0], bookmark);
                } else {
                    bookmarks.push(bookmark);
                }

                return client.setBookmarks({ conferences: bookmarks });
            })
            .then(
                function(result) {
                    if (cb) {
                        cb(null, result);
                    }
                    return result;
                },
                function(err) {
                    if (cb) {
                        cb(err);
                    } else {
                        throw err;
                    }
                }
            );
    };

    client.removeBookmark = function(jid, cb) {
        jid = new JID(jid);
        return this.getBookmarks()
            .then(function(res) {
                let bookmarks = res.privateStorage.bookmarks.conferences || [];
                bookmarks = filter(bookmarks, function(bm) {
                    return jid.bare !== bm.jid.bare;
                });
                return client.setBookmarks({ conferences: bookmarks });
            })
            .then(
                function(result) {
                    if (cb) {
                        cb(null, result);
                    }
                },
                function(err) {
                    if (cb) {
                        cb(err);
                    } else {
                        throw err;
                    }
                }
            );
    };
}
