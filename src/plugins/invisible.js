export default function(client) {
    client.goInvisible = function(cb) {
        return this.sendIq(
            {
                invisible: true,
                type: 'set'
            },
            cb
        );
    };

    client.goVisible = function(cb) {
        return this.sendIq(
            {
                type: 'set',
                visible: true
            },
            cb
        );
    };
}
