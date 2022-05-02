import * as SASL from '../../src/lib/sasl';

test('SASL - Factory.register should sort by priority', () => {
    const factory = new SASL.Factory();

    factory.register('EXTERNAL', SASL.EXTERNAL, 1000);
    factory.register('SCRAM-SHA-1-PLUS', SASL.SCRAM, 250);
    factory.register('SCRAM-SHA-256-PLUS', SASL.SCRAM, 350);
    factory.register('SCRAM-SHA-256', SASL.SCRAM, 300);
    factory.register('SCRAM-SHA-1', SASL.SCRAM, 200);
    factory.register('X-OAUTH2', SASL.X_OAUTH2, 50);
    factory.register('DIGEST-MD5', SASL.DIGEST, 100);
    factory.register('ANONYMOUS', SASL.ANONYMOUS, 0);
    factory.register('OAUTHBEARER', SASL.OAUTH, 100);
    factory.register('PLAIN', SASL.PLAIN, 1);

    expect(factory['mechanisms']).toEqual([
        { name: 'EXTERNAL', constructor: expect.anything(), priority: 1000 },
        { name: 'SCRAM-SHA-256-PLUS', constructor: expect.anything(), priority: 350 },
        { name: 'SCRAM-SHA-256', constructor: expect.anything(), priority: 300 },
        { name: 'SCRAM-SHA-1-PLUS', constructor: expect.anything(), priority: 250 },
        { name: 'SCRAM-SHA-1', constructor: expect.anything(), priority: 200 },
        { name: 'DIGEST-MD5', constructor: expect.anything(), priority: 100 },
        { name: 'OAUTHBEARER', constructor: expect.anything(), priority: 100 },
        { name: 'X-OAUTH2', constructor: expect.anything(), priority: 50 },
        { name: 'PLAIN', constructor: expect.anything(), priority: 1 },
        { name: 'ANONYMOUS', constructor: expect.anything(), priority: 0 }
    ]);
});
