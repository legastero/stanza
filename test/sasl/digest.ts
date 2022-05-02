import * as SASL from '../../src/lib/sasl';

test('SASL - DIGEST-MD5', () => {
    const factory = new SASL.Factory();
    factory.register('DIGEST-MD5', SASL.DIGEST, 10);

    const clientNonce = 'random-client-nonce';
    const creds: SASL.Credentials = {
        clientNonce: clientNonce,
        host: 'localhost',
        password: 'hunter2',
        serviceName: 'localhost',
        serviceType: 'xmpp',
        username: 'user'
    };
    const mech = factory.createMechanism(['DIGEST-MD5'], creds)!;

    expect(mech.name).toBe('DIGEST-MD5');
    expect(mech.providesMutualAuthentication).toBe(false);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce', 'realm'],
        required: [['host', 'password', 'serviceName', 'serviceType', 'username']]
    });


    const response1 = mech.createResponse(creds)!;
    expect(response1).toBeNull();

    mech.processChallenge(
        Buffer.from(
            `realm="localhost",nonce="random-server-nonce",qop="auth",algorithm=md5-sess,charset=utf-8`
        )
    );

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `username="user",realm="localhost",nonce="random-server-nonce",cnonce="random-client-nonce",nc=00000001,qop=auth,digest-uri="xmpp/localhost",response=c95abeca5a8180bc147cf0ad9060fced,charset=utf-8`
    );

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable).toBeNull();
});

test('SASL - DIGEST-MD5 with authzid', () => {
    const factory = new SASL.Factory();
    factory.register('DIGEST-MD5', SASL.DIGEST, 10);

    const clientNonce = 'random-client-nonce';
    const creds: SASL.Credentials = {
        authzid: 'authorize-as',
        clientNonce: clientNonce,
        host: 'localhost',
        password: 'hunter2',
        serviceName: 'localhost',
        serviceType: 'xmpp',
        username: 'user'
    };
    const mech = factory.createMechanism(['DIGEST-MD5'], creds)!;

    expect(mech.name).toBe('DIGEST-MD5');
    expect(mech.providesMutualAuthentication).toBe(false);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce', 'realm'],
        required: [['host', 'password', 'serviceName', 'serviceType', 'username']]
    });

    const response1 = mech.createResponse(creds)!;
    expect(response1).toBeNull();

    mech.processChallenge(
        Buffer.from(
            `realm="localhost",nonce="random-server-nonce",qop="auth",algorithm=md5-sess,charset=utf-8`
        )
    );

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `username="user",realm="localhost",nonce="random-server-nonce",cnonce="random-client-nonce",nc=00000001,qop=auth,digest-uri="xmpp/localhost",response=f2d83f628f9453c950bc42da01767529,charset=utf-8,authzid="authorize-as"`
    );

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable).toBeNull();
});

test('SASL - DIGEST-MD5 with different service name and host', () => {
    const factory = new SASL.Factory();
    factory.register('DIGEST-MD5', SASL.DIGEST, 10);

    const clientNonce = 'random-client-nonce';
    const creds: SASL.Credentials = {
        authzid: 'authorize-as',
        clientNonce: clientNonce,
        host: 'localhost',
        password: 'hunter2',
        serviceName: 'otherhost',
        serviceType: 'xmpp',
        username: 'user'
    };
    const mech = factory.createMechanism(['DIGEST-MD5'], creds)!;

    expect(mech.name).toBe('DIGEST-MD5');
    expect(mech.providesMutualAuthentication).toBe(false);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce', 'realm'],
        required: [['host', 'password', 'serviceName', 'serviceType', 'username']]
    });

    const response1 = mech.createResponse(creds)!;
    expect(response1).toBeNull();

    mech.processChallenge(
        Buffer.from(
            `realm="localhost",nonce="random-server-nonce",qop="auth",algorithm=md5-sess,charset=utf-8`
        )
    );

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `username="user",realm="localhost",nonce="random-server-nonce",cnonce="random-client-nonce",nc=00000001,qop=auth,digest-uri="xmpp/localhost/otherhost",response=ec3424293ad314da14672f35906593c0,charset=utf-8,authzid="authorize-as"`
    );

    mech.processSuccess();

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: false
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable).toBeNull();
});
