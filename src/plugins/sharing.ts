import { Agent } from '../';
import * as JID from '../JID';
import { NS_BOB, NS_HTTP_UPLOAD_0 } from '../Namespaces';
import { Bits, HTTPUploadRequest, HTTPUploadSlot } from '../protocol';

declare module '../' {
    export interface Agent {
        getBits(jid: string, cid: string): Promise<Bits>;
        getUploadService(
            domain?: string
        ): Promise<{
            maxSize?: number;
            jid: string;
        }>;

        getUploadSlot(jid: string, request: HTTPUploadRequest): Promise<HTTPUploadSlot>;
    }
}

export default function (client: Agent) {
    client.disco.addFeature(NS_BOB);

    client.getBits = async (jid, cid) => {
        const result = await client.sendIQ({
            bits: {
                cid
            } as Bits,
            to: jid,
            type: 'get'
        });

        return result.bits;
    };

    async function getUploadParameters(jid: string) {
        const disco = await client.getDiscoInfo(jid);
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

    client.getUploadService = async (domain = JID.getDomain(client.jid)) => {
        const domainParameters = await getUploadParameters(domain);
        if (domainParameters) {
            return domainParameters;
        }

        const disco = await client.getDiscoItems(domain);
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
        const resp = await client.sendIQ({
            httpUpload: {
                type: 'request',
                ...uploadRequest
            } as HTTPUploadRequest,
            to: uploadService,
            type: 'get'
        });

        return resp.httpUpload as HTTPUploadSlot;
    };
}
