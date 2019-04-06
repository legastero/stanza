import { Agent } from '../Definitions';
import { NS_MAM_2 } from '../protocol';
import { mergeFields } from '../protocol/DataForms';
import * as JID from '../protocol/JID';
import {
    DataForm,
    DataFormField,
    IQ,
    MAMFin,
    MAMPrefs,
    MAMQuery,
    MAMResult,
    Message
} from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        getHistorySearchForm(jid: string): Promise<IQ>;
        getHistoryPreferences(): Promise<IQ>;
        setHistoryPreferences(opts: Partial<MAMPrefs>): Promise<IQ>;
        searchHistory(opts: Partial<MAMQueryOptions>): Promise<IQ>;
        searchHistory(jid: string, opts: MAMQuery): Promise<IQ>;
    }
}

export interface MAMQueryOptions extends MAMQuery {
    with?: string;
    start?: Date;
    end?: Date;
}

export default function(client: Agent) {
    client.getHistorySearchForm = (jid: string) => {
        return client.sendIQ({
            archive: {
                type: 'query'
            },
            to: jid,
            type: 'get'
        });
    };

    client.searchHistory = async (
        jidOrOpts: string | Partial<MAMQueryOptions>,
        opts: Partial<MAMQueryOptions> = {}
    ) => {
        const queryid = client.nextId();

        let jid: string = '';
        if (typeof jidOrOpts === 'string') {
            jid = jidOrOpts;
        } else {
            opts = jidOrOpts;
        }

        opts.queryId = queryid;

        const form: DataForm = opts.form || {};
        form.type = 'submit';
        const fields = form.fields || [];

        const defaultFields: DataFormField[] = [
            {
                name: 'FORM_TYPE',
                type: 'hidden',
                value: NS_MAM_2
            }
        ];
        if (opts.with) {
            defaultFields.push({
                name: 'with',
                type: 'text-single',
                value: opts.with
            });
        }
        if (opts.start) {
            defaultFields.push({
                name: 'start',
                type: 'text-single',
                value: opts.start.toISOString()
            });
        }
        if (opts.end) {
            defaultFields.push({
                name: 'end',
                type: 'text-single',
                value: opts.end.toISOString()
            });
        }

        form.fields = mergeFields(defaultFields, fields);
        opts.form = form;

        const allowed = JID.allowedResponders(client.jid, jid);
        const results: MAMResult[] = [];

        const collector = (msg: Message) => {
            if (allowed.has(msg.from) && msg.archive && msg.archive.queryId === queryid) {
                results.push(msg.archive);
            }
        };

        client.on('mam:item', collector);

        try {
            const resp = await client.sendIQ<IQ & { archive: MAMQuery }, IQ & { archive: MAMFin }>({
                archive: opts,
                id: queryid,
                to: jid,
                type: 'set'
            });
            if (resp.archive && resp.archive.type === 'result') {
                resp.archive.results = results;
            }
            return resp;
        } finally {
            client.off('mam:item', collector);
        }
    };

    client.getHistoryPreferences = () => {
        return client.sendIQ({
            archive: {
                type: 'preferences'
            },
            type: 'get'
        });
    };

    client.setHistoryPreferences = (opts: Partial<MAMPrefs>) => {
        return client.sendIQ({
            archive: {
                type: 'preferences',
                ...opts
            },
            type: 'set'
        });
    };

    client.on('message', (msg: Message) => {
        if (msg.archive) {
            client.emit('mam:item', msg);
        }
    });
}
