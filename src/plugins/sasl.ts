import { Agent } from '../Definitions';
import { SASL, SASLAuth, SASLChallengeResponse } from '../protocol/stanzas';

declare module '../Definitions' {
    export interface Agent {
        getCredentials(): Promise<AgentConfig['credentials']>;
    }
    export interface AgentConfig {
        credentials: {
            [key: string]: any;
        };
    }
}

export default function(client: Agent) {
    client.registerFeature('sasl', 100, async (features, done) => {
        const mech = client.SASLFactory.create(features.sasl!.mechanisms);
        if (!mech) {
            client.releaseGroup('sasl');
            client.emit('auth:failed');
            return done('disconnect', 'authentication failed');
        }

        client.on('sasl:success', 'sasl', () => {
            client.features.negotiated.sasl = true;
            client.releaseGroup('sasl');
            client.emit('auth:success', client.config.credentials);
            done('restart');
        });
        client.on('test', d => {
            const x = d.test;
        });
        client.emit('test', {
            test: 'a'
        });

        client.on('sasl:challenge', 'sasl', async (challenge: SASLChallengeResponse) => {
            mech.challenge(challenge.value!);

            try {
                const credentials = await client.getCredentials();
                const resp = mech.response(credentials);
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
                    for (const key of Object.keys(mech.cache)) {
                        if (!mech.cache[key]) {
                            return;
                        }

                        client.config.credentials[key] = Buffer.from(mech.cache[key]);
                    }

                    client.emit('credentials:update', client.config.credentials);
                }
            } catch (err) {
                client.send('sasl', {
                    type: 'abort'
                });
            }
        });

        client.on('sasl:failure', 'sasl', () => {
            client.releaseGroup('sasl');
            client.emit('auth:failed');
            done('disconnect', 'authentication failed');
        });

        client.on('sasl:abort', 'sasl', () => {
            client.releaseGroup('sasl');
            client.emit('auth:failed');
            done('disconnect', 'authentication failed');
        });

        if (mech.clientFirst) {
            try {
                const credentials = await client.getCredentials();
                client.send('sasl', {
                    mechanism: mech.name,
                    type: 'auth',
                    value: mech.response(credentials)
                });
            } catch (err) {
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
        client.releaseGroup('sasl');
    });
}
