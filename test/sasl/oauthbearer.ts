import * as SASL from '../../src/lib/sasl';

test('SASL - OAUTHBEARER', () => {
    const factory = new SASL.Factory();
    factory.register('OAUTHBEARER', SASL.OAUTH, 10);

    const creds: SASL.Credentials = {
        token: 'bearer-token'
    };
    const mech = factory.createMechanism(['OAUTHBEARER'], creds)!;

    expect(mech.name).toBe('OAUTHBEARER');
    expect(mech.providesMutualAuthentication).toBeFalsy();

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid'],
        required: [['token']]
    });

    const response = mech.createResponse(creds)!;
    expect(response.toString('utf8')).toBe('n,,\u0001auth=Bearer bearer-token\u0001\u0001');

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;
    expect(cacheable).toBeNull();
});

test('SASL - OAUTHBEARER, failed', () => {
    const factory = new SASL.Factory();
    factory.register('OAUTHBEARER', SASL.OAUTH, 10);

    const creds: SASL.Credentials = {
        token: 'bearer-token'
    };
    const mech = factory.createMechanism(['OAUTHBEARER'], creds)!;

    expect(mech.name).toBe('OAUTHBEARER');
    expect(mech.providesMutualAuthentication).toBeFalsy();

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid'],
        required: [['token']]
    });

    const response = mech.createResponse(creds)!;
    expect(response.toString('utf8')).toBe('n,,\u0001auth=Bearer bearer-token\u0001\u0001');

    mech.processChallenge(
        Buffer.from(
            JSON.stringify({
                status: 'invalid_token',
                scope: 'some-required-scope',
                'openid-configuration': 'https://example.com/openid-connect-config'
            })
        )
    );

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe('\u0001');

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: false,
        mutuallyAuthenticated: false,
        errorData: {
            status: 'invalid_token',
            scope: 'some-required-scope',
            'openid-configuration': 'https://example.com/openid-connect-config'
        }
    });

    const cacheable = mech.getCacheableCredentials()!;
    expect(cacheable).toBeNull();
});
