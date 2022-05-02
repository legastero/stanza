import * as SASL from '../../src/lib/sasl';

test('SASL - X-OAUTH2', () => {
    const factory = new SASL.Factory();
    factory.register('X-OAUTH2', SASL.X_OAUTH2, 50);

    const creds = {
        username: 'user',
        token: 'oauth-token'
    };
    const mech = factory.createMechanism(['X-OAUTH2'], creds)!;

    expect(mech.name).toBe('X-OAUTH2');
    expect(mech.providesMutualAuthentication).toBeFalsy();

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid'],
        required: [['username', 'token']]
    });

    const response = mech.createResponse(creds)!;
    expect(response.toString("utf8")).toBe('\x00user\x00oauth-token');

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;
    expect(cacheable).toBeNull();
});

test('SASL - X-OAUTH2 with authzid', () => {
    const factory = new SASL.Factory();
    factory.register('X-OAUTH2', SASL.X_OAUTH2, 50);

    const creds = {
        authzid: 'authorize-as@domain',
        username: 'user',
        token: 'oauth-token'
    };
    const mech = factory.createMechanism(['X-OAUTH2'], creds)!;

    expect(mech.name).toBe('X-OAUTH2');
    expect(mech.providesMutualAuthentication).toBeFalsy();

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid'],
        required: [['username', 'token']]
    });

    const response = mech.createResponse(creds)!;
    expect(response.toString("utf8")).toBe('authorize-as@domain\x00user\x00oauth-token');

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;
    expect(cacheable).toBeNull();
});