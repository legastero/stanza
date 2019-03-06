import { Agent } from '../Definitions';
import { NS_HTTP_UPLOAD_0 } from '../protocol';
import * as JID from '../protocol/jid';
import { HTTPUploadRequest, HTTPUploadSlot, IQ } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        getUploadService(
            domain?: string
        ): Promise<{
            maxSize?: number;
            jid: string;
        }>;

        getUploadSlot(jid: string, request: HTTPUploadRequest): Promise<IQ>;
    }
}

export default function(client: Agent) {
    async function getUploadParameters(jid: string) {
        const { disco } = await client.getDiscoInfo(jid);
        if (!disco.features || !disco.features.includes(NS_HTTP_UPLOAD_0)) {
            return;
        }

        let maxSize;
        for (const form of disco.extensions || []) {
            const fields = form.fields || [];
            if (
                fields.some(field => field.name === 'FORM_TYPE' && field.value === NS_HTTP_UPLOAD_0)
            ) {
                const sizeField = fields.find(field => field.name === 'max-file-size');
                if (sizeField) {
                    maxSize = parseInt(sizeField.value as string, 10);
                }
                return {
                    jid,
                    maxSize
                };
            }
        }
    }

    client.getUploadService = async (domain = JID.server(client.jid)) => {
        const domainParameters = await getUploadParameters(domain);
        if (domainParameters) {
            return domainParameters;
        }

        const { disco } = await client.getDiscoItems(domain);
        for (const item of disco.items || []) {
            if (!item.jid) {
                continue;
            }

            const itemParameters = await getUploadParameters(item.jid);
            if (itemParameters) {
                return itemParameters;
            }
        }
        throw new Error('No upload service discovered on: ' + domain);
    };

    client.getUploadSlot = async (uploadService: string, uploadRequest: HTTPUploadRequest) => {
        return client.sendIQ<{ httpUpload: HTTPUploadRequest }, { httpUpload: HTTPUploadSlot }>({
            httpUpload: {
                type: 'request',
                ...uploadRequest
            },
            to: uploadService,
            type: 'get'
        });
    };
}
