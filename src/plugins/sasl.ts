import { Agent } from '../Definitions';
import { Mechanism } from '../lib/sasl';
import { SASL } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        getCredentials(): Promise<AgentConfig['credentials']>;
    }
    export interface AgentConfig {
        credentials?: {
            [key: string]: any;
        };
    }
}

export default function(client: Agent) {
    const saslHandler = async (
        sasl: SASL,
        mech: Mechanism,
        done: (cmd?: string | undefined, msg?: string | undefined) => void
    ) => {
        switch (sasl.type) {
            case 'success': {
                client.features.negotiated.sasl = true;
                client.off('sasl', saslHandler);
                client.emit('auth:success', client.config.credentials);
                done('restart');
                return;
            }

            case 'challenge': {
                mech.challenge(sasl.value!.toString());

                try {
                    const credentials = await client.getCredentials();
                    const resp = Buffer.from(mech.response(credentials) || '');
                    if (resp || resp === '') {
                        client.send('sasl', {
                            type: 'response',
                            value: resp
                        });
                    } else {
                        client.send('sasl', {
                            type: 'response'
                        });
                    }

                    if (mech.cache) {
                        if (!client.config.credentials) {
                            client.config.credentials = {};
                        }
                        for (const key of Object.keys(mech.cache)) {
                            if (!mech.cache[key]) {
                                return;
                            }
                            client.config.credentials[key] = Buffer.from(mech.cache[key]);
                        }
                        client.emit('credentials:update', client.config.credentials);
                    }
                } catch (err) {
                    console.error(err);
                    client.send('sasl', {
                        type: 'abort'
                    });
                }
                return;
            }

            case 'failure': {
                client.off('sasl', saslHandler);
                client.emit('auth:failed');
                done('disconnect', 'authentication failed');
                return;
            }

            case 'abort': {
                client.off('sasl', saslHandler);
                client.emit('auth:failed');
                done('disconnect', 'authentication failed');
                return;
            }
        }
    };

    client.registerFeature('sasl', 100, async (features, done) => {
        const mech = client.sasl.create(features.sasl!.mechanisms);
        if (!mech) {
            client.off('sasl', saslHandler);
            client.emit('auth:failed');
            return done('disconnect', 'authentication failed');
        }

        client.on('sasl', sasl => saslHandler(sasl, mech, done));

        if (mech.clientFirst) {
            try {
                const credentials = await client.getCredentials();
                client.send('sasl', {
                    mechanism: mech.name,
                    type: 'auth',
                    value: Buffer.from(mech.response(credentials) || '')
                });
            } catch (err) {
                console.error(err);
                client.send('sasl', {
                    type: 'abort'
                });
            }
        } else {
            client.send('sasl', {
                mechanism: mech.name,
                type: 'auth'
            });
        }
    });

    client.on('disconnected', () => {
        client.features.negotiated.sasl = false;
        client.off('sasl', saslHandler);
    });
}
