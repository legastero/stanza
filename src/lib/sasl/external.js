export default class External {
    response(cred) {
        return cred.authzid || '';
    }

    challenge() {
        return undefined;
    }
}

External.prototype.name = 'EXTERNAL';
External.prototype.clientFirst = true;
