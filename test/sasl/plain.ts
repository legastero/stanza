import * as SASL from '../../src/lib/sasl';

test('SASL - PLAIN', () => {
    const factory = new SASL.Factory();
    factory.register('PLAIN', SASL.PLAIN, 10);

    const creds: SASL.Credentials = {
        username: 'user',
        password: 'hunter2'
    };
    const mech = factory.createMechanism(['PLAIN'], creds)!;

    expect(mech.name).toBe('PLAIN');
    expect(mech.providesMutualAuthentication).toBeFalsy();

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid'],
        required: [['username', 'password']]
    });

    const response = mech.createResponse(creds)!;
    expect(response.toString('utf8')).toBe('\x00user\x00hunter2');

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;
    expect(cacheable).toBeNull();
});

test('SASL - PLAIN with authzid', () => {
    const factory = new SASL.Factory();
    factory.register('PLAIN', SASL.PLAIN, 10);

    const creds: SASL.Credentials = {
        authzid: 'authorize-as@domain',
        username: 'user',
        password: 'hunter2'
    };
    const mech = factory.createMechanism(['PLAIN'], creds)!;

    expect(mech.name).toBe('PLAIN');
    expect(mech.providesMutualAuthentication).toBeFalsy();

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid'],
        required: [['username', 'password']]
    });

    const response = mech.createResponse(creds)!;
    expect(response.toString('utf8')).toBe('authorize-as@domain\x00user\x00hunter2');

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;
    expect(cacheable).toBeNull();
});
