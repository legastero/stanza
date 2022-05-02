import * as SASL from '../../src/lib/sasl';

test('SASL - EXTERNAL', () => {
    const factory = new SASL.Factory();
    factory.register('EXTERNAL', SASL.EXTERNAL, 10);

    const creds: SASL.Credentials = {};
    const mech = factory.createMechanism(['EXTERNAL'], creds)!;

    expect(mech.name).toBe('EXTERNAL');
    expect(mech.providesMutualAuthentication).toBeFalsy();

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid'],
        required: [[]]
    });

    const response = mech.createResponse(creds)!;
    expect(response.toString('base64')).toBe('');

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;
    expect(cacheable).toBeNull();
});

test('SASL - EXTERNAL with authzid', () => {
    const factory = new SASL.Factory();
    factory.register('EXTERNAL', SASL.EXTERNAL, 10);

    const mech = factory.createMechanism(['EXTERNAL'], {})!;

    expect(mech.name).toBe('EXTERNAL');
    expect(mech.providesMutualAuthentication).toBeFalsy();

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid'],
        required: [[]]
    });

    const creds: SASL.Credentials = {
        authzid: 'authorize-as@domain'
    };

    const response = mech.createResponse(creds)!;
    expect(response.toString('utf8')).toBe('authorize-as@domain');

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;
    expect(cacheable).toBeNull();
});
