import expect from 'expect';
import crypto from 'crypto';
import * as stanza from '../src';

test('Connect using WebSocket', done => {
    expect.assertions(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            websocket: 'wss://anon.stanzajs.org/xmpp-websocket'
        }
    });

    client.on('session:started', () => {
        client.disconnect();
        expect(true).toBe(true);
        done();
    });

    client.connect();
});

test('Fail to connect using WebSocket', async () => {
    expect.assertions(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            websocket: 'https://anon.stanzajs.org/http-bind'
        }
    });

    expect(client.connect).rejects.toThrow();
});

test('Connect using BOSH', done => {
    expect.assertions(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            bosh: 'https://anon.stanzajs.org/http-bind'
        }
    });

    client.on('session:started', () => {
        client.disconnect();
        expect(true).toBe(true);
        done();
    });

    client.connect();
});

test('Fail to connect using BOSH', async () => {
    expect.assertions(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            bosh: 'wss://anon.stanzajs.org/xmpp-websocket'
        }
    });

    expect(client.connect).rejects.toThrow();
});

test('Connect using TCP (STARTLS)', done => {
    expect.assertions(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            tcp: true
        }
    });

    client.on('session:started', () => {
        client.disconnect();
        expect(true).toBe(true);
        done();
    });

    client.connect();
});

const validcert = 
`-----BEGIN CERTIFICATE-----
MIIFJjCCBA6gAwIBAgISAy/NagHMtd0QlUUAu4XFm1I0MA0GCSqGSIb3DQEBCwUA
MDIxCzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQswCQYDVQQD
EwJSMzAeFw0yMTA4MjcwNjIzNTBaFw0yMTExMjUwNjIzNDlaMBwxGjAYBgNVBAMT
EWFub24uc3RhbnphanMub3JnMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC
AQEAxsNE9//sy0JB0+LjZQinuk060uL8X7YpTt6D/nJJrwTsIkUe72o8cI2P1gbC
VHGYmx6vIkbs30jcV718atTEjQ7F04L63znHVulYxC3amam1TaZl52hSmatnSLVS
OKCA06bDE3KFZSqf2biBuaFHZ8IxZmGXtwwM/hlPnsMiVwWDGsY3DQBJ5wZDW8s3
HkQP4H6vxAbBgsS8CUIt62kk4STOE9MsszzFOwWiOZr85X36YXo39AUJPKuczxdS
ybu3ffHdMPkyI9GideHwZ1o429T0aNwf4/HZah7vmw1s43Hf3IM6uYYJEMVS6vAt
7O7z9Vath1rQoEYm5XfmdbvKnwIDAQABo4ICSjCCAkYwDgYDVR0PAQH/BAQDAgWg
MB0GA1UdJQQWMBQGCCsGAQUFBwMBBggrBgEFBQcDAjAMBgNVHRMBAf8EAjAAMB0G
A1UdDgQWBBSeipzQEoY2dYXEdckDk0R8gGe+OTAfBgNVHSMEGDAWgBQULrMXt1hW
y65QCUDmH6+dixTCxjBVBggrBgEFBQcBAQRJMEcwIQYIKwYBBQUHMAGGFWh0dHA6
Ly9yMy5vLmxlbmNyLm9yZzAiBggrBgEFBQcwAoYWaHR0cDovL3IzLmkubGVuY3Iu
b3JnLzAcBgNVHREEFTATghFhbm9uLnN0YW56YWpzLm9yZzBMBgNVHSAERTBDMAgG
BmeBDAECATA3BgsrBgEEAYLfEwEBATAoMCYGCCsGAQUFBwIBFhpodHRwOi8vY3Bz
LmxldHNlbmNyeXB0Lm9yZzCCAQIGCisGAQQB1nkCBAIEgfMEgfAA7gB1AFzcQ5L+
5qtFRLFemtRW5hA3+9X6R9yhc5SyXub2xw7KAAABe4Z+ULoAAAQDAEYwRAIgAqx1
vnDicFjeZu63Yec2lxUZ1S1AN7lrfQD26T4kf1wCIFzihMg0t1XHXVF3GJ6XmSkV
h9iI2oSR8KvNjT44djmBAHUA9lyUL9F3MCIUVBgIMJRWjuNNExkzv98MLyALzE7x
ZOMAAAF7hn5QtwAABAMARjBEAiA9hkYqUczSXNoDujgVCygw4aomD+tlszZQil+C
YAo9dwIgMmfGNtAiAn41g7fqyMKk5ZPxdETXa6GL1ACp81gxHAswDQYJKoZIhvcN
AQELBQADggEBAELaNEgQeEiNp89JkyQw0xITyID6lpneyGitRCDYTZvOanzhaqX/
Uhlb021QksD0uuE6eJ5YbyjB8G6TmlwAyp+Urq6lrghLfx/4nJ74nqV4YX3gzfta
AMW/WN5A+OjSHOnXd00hWJo9tybMzMLcLBdRZaDdW1zGOzA1ZI2lxXSh8i5Yoavi
1IPo28JsDFIx+JLdFvxN5MZBnOnYxyRddh1KsEnRNV0MpLbIpt7I2diINlCFif76
PBhwcAxmAK1RMIO1ubvr83vx1Aaw45i5pusKe8JOWPRsgBdaaVMBr7XUFTtp7OE0
KJcPvKcw7lee3i9IjSkr7xpLFz5XIKGrD8c=
-----END CERTIFICATE-----`;

const invalidcert =
`-----BEGIN CERTIFICATE-----
MIIEhzCCA2+gAwIBAgIQBzqkk7k/YrYKAAAAAPuB6DANBgkqhkiG9w0BAQsFADBG
MQswCQYDVQQGEwJVUzEiMCAGA1UEChMZR29vZ2xlIFRydXN0IFNlcnZpY2VzIExM
QzETMBEGA1UEAxMKR1RTIENBIDFDMzAeFw0yMTA4MjMwNDAzNDRaFw0yMTExMTUw
NDAzNDNaMBkxFzAVBgNVBAMTDnd3dy5nb29nbGUuY29tMFkwEwYHKoZIzj0CAQYI
KoZIzj0DAQcDQgAEtAzrBmnqksqM0fypfchLIYZCi1ZLifdynZglgoP0mlMEZVDs
MLFVPucGmBTIORvWhfKzIyUNGHIn9r5+dnaiM6OCAmcwggJjMA4GA1UdDwEB/wQE
AwIHgDATBgNVHSUEDDAKBggrBgEFBQcDATAMBgNVHRMBAf8EAjAAMB0GA1UdDgQW
BBQZDN5lrOyr62P9JMXMbT/M8BdMCzAfBgNVHSMEGDAWgBSKdH+vhc3ulc09nNDi
RhTzcTUdJzBqBggrBgEFBQcBAQReMFwwJwYIKwYBBQUHMAGGG2h0dHA6Ly9vY3Nw
LnBraS5nb29nL2d0czFjMzAxBggrBgEFBQcwAoYlaHR0cDovL3BraS5nb29nL3Jl
cG8vY2VydHMvZ3RzMWMzLmRlcjAZBgNVHREEEjAQgg53d3cuZ29vZ2xlLmNvbTAh
BgNVHSAEGjAYMAgGBmeBDAECATAMBgorBgEEAdZ5AgUDMDwGA1UdHwQ1MDMwMaAv
oC2GK2h0dHA6Ly9jcmxzLnBraS5nb29nL2d0czFjMy9RT3ZKME4xc1QyQS5jcmww
ggEEBgorBgEEAdZ5AgQCBIH1BIHyAPAAdwB9PvL4j/+IVWgkwsDKnlKJeSvFDngJ
fy5ql2iZfiLw1wAAAXtxZKTzAAAEAwBIMEYCIQCAct1r7Lt0HrHLsxtDwveb3Ny+
MNX0PcF6RzPQ0aijeAIhAKca0H/O2Kgf80/KNTdldTd0PyppJ7ouFy8imDdL19uJ
AHUAXNxDkv7mq0VEsV6a1FbmEDf71fpH3KFzlLJe5vbHDsoAAAF7cWSlqAAABAMA
RjBEAiBR0gYJZg2FwaK3FHCALReafzSlj7T5UCh3nHZbDxG8vAIgLTD31R9xCyrG
UlK1Thw76H0di2ziYXCh/AEiLpLn90gwDQYJKoZIhvcNAQELBQADggEBANMroXvs
YknyxdElXC2xbNWo6OSAEjof9EQmIBYDqWiToqO17Omois1qA6bF3bdqBZRaXIwl
Ut5jqmEBIEmt27e1nVDkOrY7/xhglz0BBn65pBlLGQmwl6/xSicGG0i1+SDJzB+7
b8po3s8G7BQ9tZq6uBhPXuiupfxr1co7FFo4v0GWtjTHC15/2upSfvlUu7OU2n2q
su+jEUMo1fJqaF6rioEKhWJHv1ZqPQf59CFxM8uq1reusoqY0bM7VMymJlrgnIMJ
AJC06U3ArWErYVyjuqkfbm6TDbqjy3TSGUwvmkQT6sODJMz8gEXAn9R4lNtg62Ci
rMOU4YMvqw/caKo=
-----END CERTIFICATE-----
`;
test('TCP/TLS Invalid Certificate', async () => {
    expect.assertions(1);

    const pubkey = crypto.createPublicKey(invalidcert).export({ type: 'spki', format: 'der' });
    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            tcp: { url: 'anon.stanzajs.org', port: 5222, pubkey }
        },
    });

    const fn = jest.fn();
    await (client.connect as () => Promise<void>)().catch(fn);
    expect(fn).toHaveBeenCalledTimes(1);
});

test('TCP/TLS Valid Certificate', async done => {
    expect.assertions(1);

    const pubkey = crypto.createPublicKey(validcert).export({ type: 'spki', format: 'der' });
    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            tcp: { url: 'anon.stanzajs.org', port: 5222, pubkey }
        },
    });

    client.on('session:started', () => {
        client.disconnect();
        expect(true).toBe(true);
        done();
    });
    await client.connect();
});

test('requireSecureTransport fail', async () => {
    expect.assertions(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            tcp: false,
            websocket: 'ws://anon.stanzajs.org/xmpp-websocket',
            bosh: 'http://anon.stanzajs.org/http-bind',
        },
        requireSecureTransport: true
    });

    expect(client.connect).rejects.toThrow();
});

test('requireSecureTransport succeed', async done => {
    expect.assertions(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            tcp: false,
            websocket: 'ws://anon.stanzajs.org/xmpp-websocket',
            bosh: 'https://anon.stanzajs.org/http-bind',
        },
        requireSecureTransport: true,
        transportPreferenceOrder: ['websocket', 'bosh'],
    });

    client.on('session:started', () => {
        client.disconnect();
        expect(true).toBe(true);
        done();
    });
    await client.connect();
});

test('Pick alternative', async done => {
    expect.assertions(1);

    const client = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            tcp: false,
            websocket: 'wss://anon.stanzajs.org/invalid-path',
            bosh: 'https://anon.stanzajs.org/http-bind',
        },
        transportPreferenceOrder: ['tcp', 'websocket', 'bosh']
    });

    client.on('session:started', () => {
        client.disconnect();
        expect(true).toBe(true);
        done();
    });
    await client.connect();
});

test('End to end', done => {
    expect.assertions(2);

    const client1 = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            websocket: 'wss://anon.stanzajs.org/xmpp-websocket'
        }
    });
    const client2 = stanza.createClient({
        jid: 'anon@anon.stanzajs.org',
        transports: {
            websocket: 'wss://anon.stanzajs.org/xmpp-websocket'
        }
    });

    client1.on('session:started', async () => {
        const roster = await client1.getRoster();
        expect(roster.items).toStrictEqual([]);
        client1.sendPresence();

        client2.on('session:started', async () => {
            await client2.getRoster();
            client2.sendPresence();
            client2.subscribe(client1.jid);
        });
        client2.connect();
    });

    client1.on('available', async pres => {
        if (pres.from === client1.jid) {
            return;
        }
        await client1.ping(pres.from);

        client1.sendMessage({
            to: client2.jid,
            body: 'test'
        });
    });

    client1.on('subscribe', () => {
        client1.acceptSubscription(client2.jid);
        client1.subscribe(client2.jid);
    });

    client2.on('subscribe', () => {
        client2.acceptSubscription(client1.jid);
    });

    client2.on('message', msg => {
        expect(msg.body).toBe('test');

        client1.disconnect();
        client2.disconnect();

        done();
    });

    client1.connect();
});
