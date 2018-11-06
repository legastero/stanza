export default class External {
    response(cred) {
        return cred.authzid || '';
    }

    challenge() {}
}

External.prototype.name = 'EXTERNAL';
External.prototype.clientFirst = true;
