import { Agent } from '../';
import * as JID from '../JID';
import { BookmarkStorage, IQ, MUCBookmark } from '../protocol';

declare module '../' {
    export interface Agent {
        getBookmarks(): Promise<MUCBookmark[]>;
        setBookmarks(bookmarks: MUCBookmark[]): Promise<IQ>;
        addBookmark(bookmark: MUCBookmark): Promise<IQ>;
        removeBookmark(jid: string): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.getBookmarks = async () => {
        const res = await client.getPrivateData('bookmarks');
        if (!res || !res.rooms) {
            return [];
        }
        return res.rooms;
    };

    client.setBookmarks = (bookmarks: MUCBookmark[]) => {
        return client.setPrivateData('bookmarks', {
            rooms: bookmarks
        });
    };

    client.addBookmark = async (bookmark: MUCBookmark) => {
        const mucs = await client.getBookmarks();
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
        const existingMucs = await client.getBookmarks();
        const updated = existingMucs.filter(muc => {
            return !JID.equalBare(muc.jid, jid);
        });
        return client.setBookmarks(updated);
    };
}
