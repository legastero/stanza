const test = require('tape');
const Mech = require('../../src/sasl/digest-md5');

test('DIGEST-MD5', function(t) {
    const mech = new Mech({
        genNonce: function() {
            return 'OA6MHXh6VqTrRk';
        }
    });

    mech.challenge(
        'realm="elwood.innosoft.com",nonce="OA6MG9tEQGm2hh",qop="auth",algorithm=md5-sess,charset=utf-8'
    );

    const res = mech.response({
        username: 'chris',
        password: 'secret',
        host: 'elwood.innosoft.com',
        serviceType: 'imap'
    });

    t.equal(
        res,
        'username="chris",realm="elwood.innosoft.com",nonce="OA6MG9tEQGm2hh",cnonce="OA6MHXh6VqTrRk",nc=00000001,qop=auth,digest-uri="imap/elwood.innosoft.com",response=d388dad90d4bbd760a152321f2143af7,charset=utf-8'
    );

    t.end();
});
