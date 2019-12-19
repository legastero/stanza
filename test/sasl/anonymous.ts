import * as SASL from '../../src/lib/sasl';

test('SASL - ANONYMOUS', () => {
    const factory = new SASL.Factory();
    factory.register('ANONYMOUS', SASL.ANONYMOUS, 10);

    const mech = factory.createMechanism(['ANONYMOUS'])!;

    expect(mech.name).toBe('ANONYMOUS');
    expect(mech.providesMutualAuthentication).toBeFalsy();

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['trace'],
        required: []
    });

    const creds: SASL.Credentials = {};

    const response = mech.createResponse(creds)!;
    expect(response.toString('base64')).toBe('');

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });
});

test('SASL - ANONYMOUS with trace', () => {
    const factory = new SASL.Factory();
    factory.register('ANONYMOUS', SASL.ANONYMOUS, 10);

    const mech = factory.createMechanism(['ANONYMOUS'])!;

    expect(mech.name).toBe('ANONYMOUS');
    expect(mech.providesMutualAuthentication).toBeFalsy();

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['trace'],
        required: []
    });

    const creds: SASL.Credentials = {
        trace: 'trace-identifier'
    };

    const response = mech.createResponse(creds)!;
    expect(response.toString('utf8')).toBe('trace-identifier');

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;
    expect(cacheable).toBeNull();
});
