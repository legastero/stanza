import { Agent } from '../';
import * as JID from '../JID';
import { BookmarkStorage, IQ, MUCBookmark } from '../protocol';

declare module '../' {
    export interface Agent {
        getBookmarks(): Promise<IQ>;
        setBookmarks(bookmarks: BookmarkStorage | MUCBookmark[]): Promise<IQ>;
        addBookmark(bookmark: MUCBookmark): Promise<IQ>;
        removeBookmark(jid: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.getBookmarks = () => {
        return client.getPrivateData({ bookmarks: {} });
    };

    client.setBookmarks = (bookmarks: BookmarkStorage | MUCBookmark[]) => {
        if (Array.isArray(bookmarks)) {
            return client.setPrivateData({
                bookmarks: {
                    conferences: bookmarks
                }
            });
        }
        return client.setPrivateData({ bookmarks });
    };

    client.addBookmark = async (bookmark: MUCBookmark) => {
        const resp = await client.getBookmarks();
        const mucs = resp.privateStorage!.bookmarks!.conferences || [];
        const updated: MUCBookmark[] = [];

        let updatedExisting = false;
        for (const muc of mucs) {
            if (JID.equalBare(muc.jid, bookmark.jid)) {
                updated.push({
                    ...muc,
                    ...bookmark
                });
                updatedExisting = true;
            } else {
                updated.push(muc);
            }
        }
        if (!updatedExisting) {
            updated.push(bookmark);
        }

        return client.setBookmarks(updated);
    };

    client.removeBookmark = async (jid: string) => {
        const resp = await client.getBookmarks();
        const existingMucs = resp.privateStorage!.bookmarks!.conferences || [];
        const updated = existingMucs.filter(muc => {
            return !JID.equalBare(muc.jid, jid);
        });
        return client.setBookmarks(updated);
    };
}
