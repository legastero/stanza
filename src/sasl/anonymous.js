export default class Anonymous {
    response(cred) {
        return cred.trace || '';
    }

    challenge() {}
}

Anonymous.prototype.name = 'ANONYMOUS';
Anonymous.prototype.clientFirst = true;
