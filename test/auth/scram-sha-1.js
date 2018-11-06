const test = require('tape');
const SCRAM = require('../../lib/sasl/scram-sha-1').default;

test('SCRAM', function(t) {
    const mech = new SCRAM({
        genNonce: function() {
            return 'MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc';
        }
    });

    const creds = {
        username: 'chris',
        password: 'secret'
    };

    const initial = mech.response(creds);

    t.equal(initial, 'n,,n=chris,r=MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc');

    mech.challenge(
        'r=MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc7b276f42-009a-40e2-84ee-8d5c8b206b6a,s=OTFmZGE2ZGQtYjA0Yy00MTRiLTk1ZTktYTkyYWRlMmVkYTc5,i=4096'
    );

    const res = mech.response(creds);

    t.equal(
        res,
        'c=biws,r=MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc7b276f42-009a-40e2-84ee-8d5c8b206b6a,p=WKFCdDykcs73+CG653eG721vItw='
    );

    t.end();
});
