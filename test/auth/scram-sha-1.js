var test = require('tape');
var SCRAM = require('../../src/sasl/scram-sha-1');



test('SCRAM', function (t) {
    var mech = new SCRAM({
        genNonce: function () {
            return 'MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc';
        }
    });

    var creds = {
        username: 'chris',
        password: 'secret'
    };

    var initial = mech.response(creds);

    t.equal(initial, 'n,,n=chris,r=MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc');

    mech.challenge('r=MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc7b276f42-009a-40e2-84ee-8d5c8b206b6a,s=OTFmZGE2ZGQtYjA0Yy00MTRiLTk1ZTktYTkyYWRlMmVkYTc5,i=4096');

    var res = mech.response(creds);

    t.equal(res, 'c=biws,r=MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc7b276f42-009a-40e2-84ee-8d5c8b206b6a,p=WKFCdDykcs73+CG653eG721vItw=');

    t.end();
});
