import { Agent } from '../';
import { mergeFields } from '../helpers/DataForms';
import * as JID from '../JID';
import { NS_MAM_2 } from '../Namespaces';
import {
    DataForm,
    DataFormField,
    IQ,
    MAMFin,
    MAMPrefs,
    MAMQuery,
    MAMResult,
    Message,
    ReceivedMessage
} from '../protocol';

declare module '../' {
    export interface Agent {
        getHistorySearchForm(jid: string): Promise<DataForm>;
        getHistoryPreferences(): Promise<MAMPrefs>;
        setHistoryPreferences(opts: Partial<MAMPrefs>): Promise<IQ>;
        searchHistory(opts: Partial<MAMQueryOptions>): Promise<MAMFin>;
        searchHistory(jid: string, opts: Partial<MAMQueryOptions>): Promise<MAMFin>;
    }

    export interface AgentEvents {
        'mam:item': ReceivedMessage;
    }
}

export interface MAMQueryOptions extends MAMQuery {
    with?: string;
    start?: Date;
    end?: Date;
}

export default function (client: Agent): void {
    client.getHistorySearchForm = async (jid: string, opts: MAMQuery = {}) => {
        const res = await client.sendIQ<{ archive: MAMQuery }>({
            archive: {
                type: 'query',
                version: opts.version
            },
            to: jid,
            type: 'get'
        });
        return res.archive.form!;
    };

    client.searchHistory = async (
        jidOrOpts: string | (Partial<MAMQueryOptions> & { to?: string }),
        opts: Partial<MAMQueryOptions> = {}
    ) => {
        const queryid = client.nextId();

        let jid = '';
        if (typeof jidOrOpts === 'string') {
            jid = jidOrOpts;
        } else {
            jid = jidOrOpts.to || '';
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

            return {
                ...resp.archive,
                results
            };
        } finally {
            client.off('mam:item', collector);
        }
    };

    client.getHistoryPreferences = async () => {
        const resp = await client.sendIQ({
            archive: {
                type: 'preferences'
            },
            type: 'get'
        });
        return resp.archive;
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

    client.on('message', msg => {
        if (msg.archive) {
            client.emit('mam:item', msg);
        }
    });
}
