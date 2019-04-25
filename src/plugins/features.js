export default function(client) {
    client.features = {
        handlers: {},
        negotiated: {},
        order: []
    };

    client.registerFeature = function(name, priority, handler) {
        this.features.order.push({
            name,
            priority
        });
        this.features.order.sort((a, b) => a.priority - b.priority);
        this.features.handlers[name] = handler.bind(client);
    };

    client.on('streamFeatures', async function(features) {
        const series = [];
        const negotiated = client.features.negotiated;
        const handlers = client.features.handlers;

        for (const feature of client.features.order) {
            const name = feature.name;
            if (features[name] && handlers[name] && !negotiated[name]) {
                series.push(
                    () =>
                        new Promise(resolve => {
                            if (!negotiated[name]) {
                                handlers[name](features, (cmd, msg) => {
                                    if (cmd) {
                                        resolve({ command: cmd, message: msg });
                                    } else {
                                        resolve();
                                    }
                                });
                            } else {
                                resolve();
                            }
                        })
                );
            }
        }

        for (const handler of series) {
            let cmd = '';
            let msg = '';
            try {
                const res = await handler();
                if (res) {
                    cmd = res.command;
                    msg = res.message;
                }
            } catch (err) {
                cmd = 'disconnect';
                msg = err.message;
                console.error(err);
            }
            if (!cmd) {
                continue;
            }

            if (cmd === 'restart') {
                client.transport.restart();
            }
            if (cmd === 'disconnect') {
                client.emit('stream:error', {
                    condition: 'policy-violation',
                    text: 'Failed to negotiate stream features: ' + msg
                });
                client.disconnect();
            }
            return;
        }
    });
}
