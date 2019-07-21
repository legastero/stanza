import test from 'tape';
import { SCRAM } from '../../src/lib/sasl';

// tslint:disable no-hardcoded-credentials

test('SCRAM', t => {
    const mech = new SCRAM('SCRAM-SHA-1');
    const initial = mech
        .createResponse({
            clientNonce: 'MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc',
            password: 'secret',
            username: 'chris'
        })!
        .toString();
    t.equal(initial, 'n,,n=chris,r=MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc');

    mech.processChallenge(
        Buffer.from(
            'r=MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc7b276f42-009a-40e2-84ee-8d5c8b206b6a,s=OTFmZGE2ZGQtYjA0Yy00MTRiLTk1ZTktYTkyYWRlMmVkYTc5,i=4096'
        )
    );

    const res = mech
        .createResponse({
            clientNonce: 'MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc',
            password: 'secret',
            username: 'chris'
        })!
        .toString();
    t.equal(
        res,
        'c=biws,r=MsQUY9iw0T9fx2MUEz6LZPwGuhVvWAhc7b276f42-009a-40e2-84ee-8d5c8b206b6a,p=WKFCdDykcs73+CG653eG721vItw='
    );

    t.end();
});
