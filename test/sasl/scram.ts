import * as SASL from '../../src/lib/sasl';
import { saslprep } from '../../src/lib/stringprep';

test('SASL - SCRAM-SHA-1', () => {
    const factory = new SASL.Factory();
    factory.register('SCRAM-SHA-1', SASL.SCRAM, 10);

    const salt = Buffer.from('salt').toString('base64');
    const serverNonce = Buffer.from('client-random-noncerandom-server-nonce').toString('base64');
    const clientNonce = Buffer.from('random-client-nonce').toString('base64');

    const creds: SASL.Credentials = {
        username: 'user',
        password: 'hunter2',
        clientNonce: clientNonce
    };
    const mech = factory.createMechanism(['SCRAM-SHA-1'], creds)!;

    expect(mech.name).toBe('SCRAM-SHA-1');
    expect(mech.providesMutualAuthentication).toBe(true);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce'],
        required: [['username', 'password'], ['username', 'saltedPassword'], ['clientKey', 'serverKey']]
    });

    const saltedPassword = SASL.Hi(
        Buffer.from(saslprep(creds.password || '')),
        Buffer.from(salt, 'base64'),
        4096,
        'sha-1'
    );
    const clientKey = SASL.HMAC(saltedPassword, Buffer.from('Client Key'), 'sha-1').toString(
        'base64'
    );
    const serverKey = SASL.HMAC(saltedPassword, Buffer.from('Server Key'), 'sha-1').toString(
        'base64'
    );

    const response1 = mech.createResponse(creds)!;
    expect(response1.toString('utf8')).toBe(`n,,n=user,r=${clientNonce}`);

    mech.processChallenge(Buffer.from(`r=${serverNonce},s=${salt},i=4096`));

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `c=biws,r=${serverNonce},p=vPSMJJN1Qqj46KBP47BVwdGGGtc=`
    );

    mech.processSuccess(Buffer.from('v=2hukgDMhQVOA8RcXuzFCEVsHSxE='));

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: true
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable.clientKey).toBeTruthy();
    expect(cacheable.clientKey!.toString('base64')).toBe(clientKey);

    expect(cacheable.serverKey).toBeTruthy();
    expect(cacheable.serverKey!.toString('base64')).toBe(serverKey);

    expect(cacheable.salt).toBeTruthy();
    expect(cacheable.salt!.toString('base64')).toBe(salt);

    expect(cacheable.saltedPassword).toBeTruthy();
    expect(cacheable.saltedPassword!.toString('base64')).toBe(saltedPassword.toString('base64'));
});

test('SASL - SCRAM-SHA-1 (with tlsUnique available)', () => {
    const factory = new SASL.Factory();
    factory.register('SCRAM-SHA-1', SASL.SCRAM, 10);

    const salt = Buffer.from('salt').toString('base64');
    const serverNonce = Buffer.from('client-random-noncerandom-server-nonce').toString('base64');
    const clientNonce = Buffer.from('random-client-nonce').toString('base64');

    const creds: SASL.Credentials = {
        username: 'user',
        password: 'hunter2',
        clientNonce: clientNonce,
        tlsUnique: Buffer.from('tls-unique-data')
    };
    const mech = factory.createMechanism(['SCRAM-SHA-1'], creds)!;

    expect(mech.name).toBe('SCRAM-SHA-1');
    expect(mech.providesMutualAuthentication).toBe(true);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce'],
        required: [['username', 'password'], ['username', 'saltedPassword'], ['clientKey', 'serverKey']]
    });

    const saltedPassword = SASL.Hi(
        Buffer.from(saslprep(creds.password || '')),
        Buffer.from(salt, 'base64'),
        4096,
        'sha-1'
    );
    const clientKey = SASL.HMAC(saltedPassword, Buffer.from('Client Key'), 'sha-1').toString(
        'base64'
    );
    const serverKey = SASL.HMAC(saltedPassword, Buffer.from('Server Key'), 'sha-1').toString(
        'base64'
    );
    const cbind = Buffer.from('y,,tls-unique-data').toString('base64');

    const response1 = mech.createResponse(creds)!;
    expect(response1.toString('utf8')).toBe(`y,,n=user,r=${clientNonce}`);

    mech.processChallenge(Buffer.from(`r=${serverNonce},s=${salt},i=4096`));

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `c=${cbind},r=${serverNonce},p=4vEpRgM5VdbBeXc+HdAiEl86d+I=`
    );

    mech.processSuccess(Buffer.from('v=pmXuDyDvBFTncmJWXcW5nc4givE='));

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: true
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable.clientKey).toBeTruthy();
    expect(cacheable.clientKey!.toString('base64')).toBe(clientKey);

    expect(cacheable.serverKey).toBeTruthy();
    expect(cacheable.serverKey!.toString('base64')).toBe(serverKey);

    expect(cacheable.salt).toBeTruthy();
    expect(cacheable.salt!.toString('base64')).toBe(salt);

    expect(cacheable.saltedPassword).toBeTruthy();
    expect(cacheable.saltedPassword!.toString('base64')).toBe(saltedPassword.toString('base64'));
});

test('SASL - SCRAM-SHA-1-PLUS', () => {
    const factory = new SASL.Factory();
    factory.register('SCRAM-SHA-1-PLUS', SASL.SCRAM, 10);

    const salt = Buffer.from('salt').toString('base64');
    const serverNonce = Buffer.from('client-random-noncerandom-server-nonce').toString('base64');
    const clientNonce = Buffer.from('random-client-nonce').toString('base64');

    const creds: SASL.Credentials = {
        username: 'user',
        password: 'hunter2',
        clientNonce: clientNonce,
        tlsUnique: Buffer.from('tls-unique-data')
    };
    const mech = factory.createMechanism(['SCRAM-SHA-1-PLUS'], creds)!;

    expect(mech.name).toBe('SCRAM-SHA-1-PLUS');
    expect(mech.providesMutualAuthentication).toBe(true);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce'],
        required: [['username', 'password', 'tlsUnique'], ['username', 'saltedPassword', 'tlsUnique'], ['clientKey', 'serverKey', 'tlsUnique']]
    });

    const saltedPassword = SASL.Hi(
        Buffer.from(saslprep(creds.password || '')),
        Buffer.from(salt, 'base64'),
        4096,
        'sha-1'
    );
    const clientKey = SASL.HMAC(saltedPassword, Buffer.from('Client Key'), 'sha-1').toString(
        'base64'
    );
    const serverKey = SASL.HMAC(saltedPassword, Buffer.from('Server Key'), 'sha-1').toString(
        'base64'
    );
    const cbind = Buffer.from('p=tls-unique,,tls-unique-data').toString('base64');

    const response1 = mech.createResponse(creds)!;
    expect(response1.toString('utf8')).toBe(`p=tls-unique,,n=user,r=${clientNonce}`);

    mech.processChallenge(Buffer.from(`r=${serverNonce},s=${salt},i=4096`));

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `c=${cbind},r=${serverNonce},p=7n3ylyO/bXvpEnjSs4W0BfpnBKU=`
    );

    mech.processSuccess(Buffer.from('v=4V2mhj7RFVylnhG6bE89T539lnI='));

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: true
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable.clientKey).toBeTruthy();
    expect(cacheable.clientKey!.toString('base64')).toBe(clientKey);

    expect(cacheable.serverKey).toBeTruthy();
    expect(cacheable.serverKey!.toString('base64')).toBe(serverKey);

    expect(cacheable.salt).toBeTruthy();
    expect(cacheable.salt!.toString('base64')).toBe(salt);

    expect(cacheable.saltedPassword).toBeTruthy();
    expect(cacheable.saltedPassword!.toString('base64')).toBe(saltedPassword.toString('base64'));
});

test('SASL - SCRAM-SHA-1, with escaped username', () => {
    const factory = new SASL.Factory();
    factory.register('SCRAM-SHA-1', SASL.SCRAM, 10);

    const salt = Buffer.from('salt').toString('base64');
    const serverNonce = Buffer.from('client-random-noncerandom-server-nonce').toString('base64');
    const clientNonce = Buffer.from('random-client-nonce').toString('base64');

    const creds: SASL.Credentials = {
        username: 'u,s=er',
        password: 'hunter2',
        clientNonce: clientNonce
    };
    const mech = factory.createMechanism(['SCRAM-SHA-1'], creds)!;

    expect(mech.name).toBe('SCRAM-SHA-1');
    expect(mech.providesMutualAuthentication).toBe(true);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce'],
        required: [['username', 'password'], ['username', 'saltedPassword'], ['clientKey', 'serverKey']]
    });

    const saltedPassword = SASL.Hi(
        Buffer.from(saslprep(creds.password || '')),
        Buffer.from(salt, 'base64'),
        4096,
        'sha-1'
    );
    const clientKey = SASL.HMAC(saltedPassword, Buffer.from('Client Key'), 'sha-1').toString(
        'base64'
    );
    const serverKey = SASL.HMAC(saltedPassword, Buffer.from('Server Key'), 'sha-1').toString(
        'base64'
    );

    const response1 = mech.createResponse(creds)!;
    expect(response1.toString('utf8')).toBe(`n,,n=u=2Cs=3Der,r=${clientNonce}`);

    mech.processChallenge(Buffer.from(`r=${serverNonce},s=${salt},i=4096`));

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `c=biws,r=${serverNonce},p=BOF2Zu+xyc2Hn/zDtmUvN9vj1p8=`
    );

    mech.processSuccess(Buffer.from('v=3ZedrM4spp2DuPlkPzztNmT0ZPI='));

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: true
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable.clientKey).toBeTruthy();
    expect(cacheable.clientKey!.toString('base64')).toBe(clientKey);

    expect(cacheable.serverKey).toBeTruthy();
    expect(cacheable.serverKey!.toString('base64')).toBe(serverKey);

    expect(cacheable.salt).toBeTruthy();
    expect(cacheable.salt!.toString('base64')).toBe(salt);

    expect(cacheable.saltedPassword).toBeTruthy();
    expect(cacheable.saltedPassword!.toString('base64')).toBe(saltedPassword.toString('base64'));
});

test('SASL - SCRAM-SHA-1 with salted password', () => {
    const factory = new SASL.Factory();
    factory.register('SCRAM-SHA-1', SASL.SCRAM, 10);

    const salt = Buffer.from('salt').toString('base64');
    const serverNonce = Buffer.from('client-random-noncerandom-server-nonce').toString('base64');
    const clientNonce = Buffer.from('random-client-nonce').toString('base64');
    
    const saltedPassword = SASL.Hi(
        Buffer.from(saslprep('hunter2')),
        Buffer.from(salt, 'base64'),
        4096,
        'sha-1'
    );
    const clientKey = SASL.HMAC(saltedPassword, Buffer.from('Client Key'), 'sha-1').toString(
        'base64'
    );
    const serverKey = SASL.HMAC(saltedPassword, Buffer.from('Server Key'), 'sha-1').toString(
        'base64'
    );
    const creds: SASL.Credentials & SASL.CacheableCredentials = {
        username: 'user',
        clientNonce: clientNonce,
        salt: Buffer.from(salt, 'base64'),
        saltedPassword
    };
    const mech = factory.createMechanism(['SCRAM-SHA-1'], creds)!;

    expect(mech.name).toBe('SCRAM-SHA-1');
    expect(mech.providesMutualAuthentication).toBe(true);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce'],
        required: [['username', 'password'], ['username', 'saltedPassword'], ['clientKey', 'serverKey']]
    });

    const response1 = mech.createResponse(creds)!;
    expect(response1.toString('utf8')).toBe(`n,,n=user,r=${clientNonce}`);

    mech.processChallenge(Buffer.from(`r=${serverNonce},s=${salt},i=4096`));

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `c=biws,r=${serverNonce},p=vPSMJJN1Qqj46KBP47BVwdGGGtc=`
    );

    mech.processSuccess(Buffer.from('v=2hukgDMhQVOA8RcXuzFCEVsHSxE='));

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: true
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable.clientKey).toBeTruthy();
    expect(cacheable.clientKey!.toString('base64')).toBe(clientKey);

    expect(cacheable.serverKey).toBeTruthy();
    expect(cacheable.serverKey!.toString('base64')).toBe(serverKey);

    expect(cacheable.salt).toBeTruthy();
    expect(cacheable.salt!.toString('base64')).toBe(salt);

    expect(cacheable.saltedPassword).toBeTruthy();
    expect(cacheable.saltedPassword!.toString('base64')).toBe(saltedPassword.toString('base64'));
});

test('SASL - SCRAM-SHA-1 with client and server keys', () => {
    const factory = new SASL.Factory();
    factory.register('SCRAM-SHA-1', SASL.SCRAM, 10);

    const salt = Buffer.from('salt').toString('base64');
    const serverNonce = Buffer.from('client-random-noncerandom-server-nonce').toString('base64');
    const clientNonce = Buffer.from('random-client-nonce').toString('base64');

    const saltedPassword = SASL.Hi(
        Buffer.from(saslprep('hunter2')),
        Buffer.from(salt, 'base64'),
        4096,
        'sha-1'
    );
    const clientKey = SASL.HMAC(saltedPassword, Buffer.from('Client Key'), 'sha-1').toString(
        'base64'
    );
    const serverKey = SASL.HMAC(saltedPassword, Buffer.from('Server Key'), 'sha-1').toString(
        'base64'
    );
    const creds: SASL.Credentials & SASL.CacheableCredentials = {
        username: 'user',
        clientKey: Buffer.from(clientKey, 'base64'),
        clientNonce: clientNonce,
        salt: Buffer.from(salt, 'base64'),
        serverKey: Buffer.from(serverKey, 'base64')
    };
    const mech = factory.createMechanism(['SCRAM-SHA-1'], creds)!;

    expect(mech.name).toBe('SCRAM-SHA-1');
    expect(mech.providesMutualAuthentication).toBe(true);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce'],
        required: [['username', 'password'], ['username', 'saltedPassword'], ['clientKey', 'serverKey']]
    });

    const response1 = mech.createResponse(creds)!;
    expect(response1.toString('utf8')).toBe(`n,,n=user,r=${clientNonce}`);

    mech.processChallenge(Buffer.from(`r=${serverNonce},s=${salt},i=4096`));

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `c=biws,r=${serverNonce},p=vPSMJJN1Qqj46KBP47BVwdGGGtc=`
    );

    mech.processSuccess(Buffer.from('v=2hukgDMhQVOA8RcXuzFCEVsHSxE='));

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: true
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable.clientKey).toBeTruthy();
    expect(cacheable.clientKey!.toString('base64')).toBe(clientKey);

    expect(cacheable.serverKey).toBeTruthy();
    expect(cacheable.serverKey!.toString('base64')).toBe(serverKey);

    expect(cacheable.salt).toBeTruthy();
    expect(cacheable.salt!.toString('base64')).toBe(salt);
});

test('SASL - SCRAM-SHA-1 with authzid', () => {
    const factory = new SASL.Factory();
    factory.register('SCRAM-SHA-1', SASL.SCRAM, 10);

    const salt = Buffer.from('salt').toString('base64');
    const serverNonce = Buffer.from('client-random-noncerandom-server-nonce').toString('base64');
    const clientNonce = Buffer.from('random-client-nonce').toString('base64');

    const creds: SASL.Credentials = {
        authzid: 'authorize-as',
        username: 'user',
        password: 'hunter2',
        clientNonce: clientNonce
    };
    const mech = factory.createMechanism(['SCRAM-SHA-1'], creds)!;

    expect(mech.name).toBe('SCRAM-SHA-1');
    expect(mech.providesMutualAuthentication).toBe(true);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce'],
        required: [['username', 'password'], ['username', 'saltedPassword'], ['clientKey', 'serverKey']]
    });

    const saltedPassword = SASL.Hi(
        Buffer.from(saslprep(creds.password || '')),
        Buffer.from(salt, 'base64'),
        4096,
        'sha-1'
    );
    const clientKey = SASL.HMAC(saltedPassword, Buffer.from('Client Key'), 'sha-1').toString(
        'base64'
    );
    const serverKey = SASL.HMAC(saltedPassword, Buffer.from('Server Key'), 'sha-1').toString(
        'base64'
    );
    const cbind = Buffer.from(`n,a=${creds.authzid},`).toString('base64');

    const response1 = mech.createResponse(creds)!;
    expect(response1.toString('utf8')).toBe(`n,a=authorize-as,n=user,r=${clientNonce}`);

    mech.processChallenge(Buffer.from(`r=${serverNonce},s=${salt},i=4096`));

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `c=${cbind},r=${serverNonce},p=XBjl166LqGZmIl/vK49LO1GZdFY=`
    );

    mech.processSuccess(Buffer.from('v=l7qWumbiFKfaoAXKFcxvWzREHAY='));

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: true
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable.clientKey).toBeTruthy();
    expect(cacheable.clientKey!.toString('base64')).toBe(clientKey);

    expect(cacheable.serverKey).toBeTruthy();
    expect(cacheable.serverKey!.toString('base64')).toBe(serverKey);

    expect(cacheable.salt).toBeTruthy();
    expect(cacheable.salt!.toString('base64')).toBe(salt);

    expect(cacheable.saltedPassword).toBeTruthy();
    expect(cacheable.saltedPassword!.toString('base64')).toBe(saltedPassword.toString('base64'));
});

test('SASL - SCRAM-SHA-256', () => {
    const factory = new SASL.Factory();
    factory.register('SCRAM-SHA-256', SASL.SCRAM, 10);

    const salt = Buffer.from('salt').toString('base64');
    const serverNonce = Buffer.from('client-random-noncerandom-server-nonce').toString('base64');
    const clientNonce = Buffer.from('random-client-nonce').toString('base64');

    const creds: SASL.Credentials = {
        username: 'user',
        password: 'hunter2',
        clientNonce: clientNonce
    };
    const mech = factory.createMechanism(['SCRAM-SHA-256'], creds)!;

    expect(mech.name).toBe('SCRAM-SHA-256');
    expect(mech.providesMutualAuthentication).toBe(true);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce'],
        required: [['username', 'password'], ['username', 'saltedPassword'], ['clientKey', 'serverKey']]
    });

    const saltedPassword = SASL.Hi(
        Buffer.from(saslprep(creds.password || '')),
        Buffer.from(salt, 'base64'),
        4096,
        'sha-256'
    );
    const clientKey = SASL.HMAC(saltedPassword, Buffer.from('Client Key'), 'sha-256').toString(
        'base64'
    );
    const serverKey = SASL.HMAC(saltedPassword, Buffer.from('Server Key'), 'sha-256').toString(
        'base64'
    );

    const response1 = mech.createResponse(creds)!;
    expect(response1.toString('utf8')).toBe(`n,,n=user,r=${clientNonce}`);

    mech.processChallenge(Buffer.from(`r=${serverNonce},s=${salt},i=4096`));

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `c=biws,r=${serverNonce},p=46mvUKLq67R/FEejJWlt/FkaPBKZ9pFMdZJecHWIogY=`
    );

    //console.log((mech as any).serverSignature.toString('base64'));
    mech.processSuccess(Buffer.from('v=PAM0+ow1bgYNN6U6hfZQ2jbhn4U6MpmGsuE1IcOiZLk='));

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: true,
        mutuallyAuthenticated: true
    });

    const cacheable = mech.getCacheableCredentials()!;

    expect(cacheable.clientKey).toBeTruthy();
    expect(cacheable.clientKey!.toString('base64')).toBe(clientKey);

    expect(cacheable.serverKey).toBeTruthy();
    expect(cacheable.serverKey!.toString('base64')).toBe(serverKey);

    expect(cacheable.salt).toBeTruthy();
    expect(cacheable.salt!.toString('base64')).toBe(salt);

    expect(cacheable.saltedPassword).toBeTruthy();
    expect(cacheable.saltedPassword!.toString('base64')).toBe(saltedPassword.toString('base64'));
});

test('SASL - SCRAM-SHA-1 server error', () => {
    const factory = new SASL.Factory();
    factory.register('SCRAM-SHA-1', SASL.SCRAM, 10);

    const salt = Buffer.from('salt').toString('base64');
    const serverNonce = Buffer.from('client-random-noncerandom-server-nonce').toString('base64');
    const clientNonce = Buffer.from('random-client-nonce').toString('base64');

    const creds: SASL.Credentials = {
        username: 'user',
        password: 'hunter2',
        clientNonce: clientNonce
    };
    const mech = factory.createMechanism(['SCRAM-SHA-1'], creds)!;

    expect(mech.name).toBe('SCRAM-SHA-1');
    expect(mech.providesMutualAuthentication).toBe(true);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce'],
        required: [['username', 'password'], ['username', 'saltedPassword'], ['clientKey', 'serverKey']]
    });

    const response1 = mech.createResponse(creds)!;
    expect(response1.toString('utf8')).toBe(`n,,n=user,r=${clientNonce}`);

    mech.processChallenge(Buffer.from(`r=${serverNonce},s=${salt},i=4096`));

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `c=biws,r=${serverNonce},p=vPSMJJN1Qqj46KBP47BVwdGGGtc=`
    );

    mech.processSuccess(Buffer.from('e=other-error'));

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: false,
        error: 'other-error',
        mutuallyAuthenticated: false
    });
});

test('SASL - SCRAM-SHA-1 invalid signature', () => {
    const factory = new SASL.Factory();
    factory.register('SCRAM-SHA-1', SASL.SCRAM, 10);

    const salt = Buffer.from('salt').toString('base64');
    const serverNonce = Buffer.from('client-random-noncerandom-server-nonce').toString('base64');
    const clientNonce = Buffer.from('random-client-nonce').toString('base64');

    const creds: SASL.Credentials = {
        username: 'user',
        password: 'hunter2',
        clientNonce: clientNonce
    };
    const mech = factory.createMechanism(['SCRAM-SHA-1'], creds)!;

    expect(mech.name).toBe('SCRAM-SHA-1');
    expect(mech.providesMutualAuthentication).toBe(true);

    const neededCreds = mech.getExpectedCredentials();
    expect(neededCreds).toStrictEqual({
        optional: ['authzid', 'clientNonce'],
        required: [['username', 'password'], ['username', 'saltedPassword'], ['clientKey', 'serverKey']]
    });

    const response1 = mech.createResponse(creds)!;
    expect(response1.toString('utf8')).toBe(`n,,n=user,r=${clientNonce}`);

    mech.processChallenge(Buffer.from(`r=${serverNonce},s=${salt},i=4096`));

    const response2 = mech.createResponse(creds)!;
    expect(response2.toString('utf8')).toBe(
        `c=biws,r=${serverNonce},p=vPSMJJN1Qqj46KBP47BVwdGGGtc=`
    );

    mech.processSuccess(Buffer.from('v=invalid-signature'));

    const result = mech.finalize(creds);
    expect(result).toStrictEqual({
        authenticated: false,
        error: 'Mutual authentication failed',
        mutuallyAuthenticated: false
    });
});
