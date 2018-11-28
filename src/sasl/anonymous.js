export default class Anonymous {
    response(cred) {
        return cred.trace || '';
    }

    challenge() {
        return undefined;
    }
}

Anonymous.prototype.name = 'ANONYMOUS';
Anonymous.prototype.clientFirst = true;
