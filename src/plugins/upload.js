export default function(client) {
    async function getUploadParameters(jid) {
        const { discoInfo } = await client.getDiscoInfo(jid);
        if (discoInfo.features.includes('urn:xmpp:http:upload:0')) {
            const fields = discoInfo.form.fields;
            let maxSize = null;
            if (
                fields.some(
                    field =>
                        field.name === 'FORM_TYPE' && field.value.includes('urn:xmpp:http:upload:0')
                )
            ) {
                maxSize = parseInt(fields.find(field => field.name === 'max-file-size').value, 10);
            }
            return { maxSize, jid };
        }
    }

    client.getUploadService = async function(domain = client.jid.domain) {
        const domainParameters = await getUploadParameters(domain);
        if (domainParameters) {
            return domainParameters;
        }
        const { discoItems } = await client.getDiscoItems(domain);
        for (const item of discoItems.items) {
            const itemParameters = await getUploadParameters(item.jid);
            if (itemParameters) {
                return itemParameters;
            }
        }
        throw new Error('No upload service discovered on: ' + domain);
    };

    client.getUploadSlot = function(uploadService, uploadRequest, cb) {
        return client.sendIq(
            {
                to: uploadService,
                type: 'get',
                uploadRequest
            },
            cb
        );
    };
}
