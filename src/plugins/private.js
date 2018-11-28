export default function(client) {
    client.getPrivateData = function(opts, cb) {
        return this.sendIq(
            {
                privateStorage: opts,
                type: 'get'
            },
            cb
        );
    };

    client.setPrivateData = function(opts, cb) {
        return this.sendIq(
            {
                privateStorage: opts,
                type: 'set'
            },
            cb
        );
    };
}
