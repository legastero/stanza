import { Agent, JID } from '../';
import { CacheableCredentials, Credentials, ExpectedCredentials } from '../lib/SASL';
import { SASL } from '../protocol';

const CREDENTIALS_REQUEST = 'credentials:request';

declare module '../' {
    export interface Agent {
        getCredentials(expected?: ExpectedCredentials): Promise<Credentials>;
    }
    export interface AgentConfig {
        /**
         * Account Credentials
         *
         * The <code>credentials</code> object is used to pass multiple credential values (not just a password).
         * These are primarily values that have been previously cached.
         *
         * If you only need to set a password, then the <code>password</code> config field can be used instead.
         */
        credentials?: Credentials;

        /**
         * Maximum Authentication Attempts
         *
         * The number of times to allow an authentication failure before aborting and disconnectig. This number
         * should be at least 2, and no more than 5.
         *
         * @default 5
         */
        maxAuthAttempts?: number;
    }
    export interface AgentEvents {
        'auth:success'?: Credentials;
        'auth:failed': void;
        'credentials:update': Credentials;
        sasl: SASL;
    }
    export interface AgentHooks {
        'auth:success'?: Credentials;
        'auth:failed': void;
        'credentials:request': {
            credentials: Credentials;
            expected: ExpectedCredentials;
        };
        'credentials:update': CacheableCredentials;
    }
}

export default function(client: Agent) {
    client.registerFeature('sasl', 100, async (features, done) => {
        const trySASL = async (attempts: number): Promise<string> => {
            const mechanism = client.sasl.createMechanism(features.sasl!.mechanisms);
            if (!mechanism) {
                return 'disconnect';
            }

            let fetchedCreds: { credentials: Credentials; expected: ExpectedCredentials };
            try {
                fetchedCreds = await client.hooks.emit(CREDENTIALS_REQUEST, {
                    credentials: {},
                    expected: mechanism.getExpectedCredentials()
                });

                client.send('sasl', {
                    mechanism: mechanism.name,
                    type: 'auth',
                    value: mechanism.createResponse(fetchedCreds.credentials)!
                });
            } catch (err) {
                client.log('error', 'Authentication error', err);
                client.send('sasl', {
                    type: 'abort'
                });
            }

            return new Promise<string>(resolve => {
                const handler = async (stanza: SASL) => {
                    if (stanza.type === 'challenge') {
                        mechanism.processChallenge(stanza.value!);
                        client.send('sasl', {
                            type: 'response',
                            value: mechanism.createResponse(fetchedCreds.credentials)!
                        });
                        return;
                    }

                    client.removeListener('sasl', handler);

                    if (stanza.type === 'success') {
                        mechanism.processSuccess(stanza.value!);
                        const result = mechanism.finalize(fetchedCreds.credentials);

                        if (
                            mechanism.providesMutualAuthentication &&
                            !result.mutuallyAuthenticated
                        ) {
                            client.log('error', 'Mutual authentication failed, aborting');
                            resolve('disconnect');
                            return;
                        }

                        client.features.negotiated.sasl = true;
                        if (client.transport) {
                            client.transport.authenticated = true;
                        }
                        const cacheableCredentials = mechanism.getCacheableCredentials();
                        await client.emitCompat('auth:success', fetchedCreds.credentials);
                        if (cacheableCredentials) {
                            await client.emitCompat('credentials:update', cacheableCredentials);
                        }
                        resolve('restart');
                    }
                    if (stanza.type === 'failure') {
                        if (client.transport) {
                            client.transport.authenticated = false;
                        }
                        await client.emitCompat('auth:failed');
                        if (attempts > 0 && stanza.condition !== 'aborted') {
                            resolve(trySASL(attempts - 1));
                        } else {
                            resolve('disconnect');
                        }
                    }
                };
                client.on('sasl', handler);
                client.once('disconnected', () => {
                    client.off('sasl', handler);
                });
            });
        };

        client.once('--reset-stream-features', () => {
            client.features.negotiated.sasl = false;
        });

        const res = await trySASL(client.config.maxAuthAttempts || 5);
        done(res);
    });

    client.getCredentials = async (expected?: ExpectedCredentials): Promise<Credentials> => {
        const result = await client.hooks.emit(CREDENTIALS_REQUEST, {
            credentials: {},
            expected: expected ? expected : { optional: [], required: [] }
        });
        return result.credentials;
    };

    client.hooks.on(CREDENTIALS_REQUEST, async event => {
        const { credentials, expected } = event.data;
        const requestedJID = JID.parse(client.config.jid || '');
        const creds = client.config.credentials || {};
        const server = creds.host || requestedJID.domain;
        const knownCredentials = {
            password: creds.password,
            realm: server,
            server,
            serviceName: server,
            serviceType: 'xmpp',
            username: creds.username || requestedJID.local,
            ...(client.config.credentials || {})
        };
        for (const cred of [...expected.required, ...expected.optional]) {
            if (!credentials[cred] && knownCredentials[cred]) {
                (credentials[cred] as any) = knownCredentials[cred];
            }
        }
    });
}
