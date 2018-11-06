import { JID } from 'xmpp-jid';

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

                let existing = false;
                for (let i = 0; i < bookmarks.length; i++) {
                    const bm = bookmarks[i];
                    if (bm.jid.bare === bookmark.jid.bare) {
                        bookmarks[i] = {
                            ...bm,
                            ...bookmark
                        };
                        existing = true;
                        break;
                    }
                }
                if (!existing) {
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
                bookmarks = bookmarks.filter(bm => {
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
