export default class XOAuth2 {
    response(cred) {
        var str = '';
        str += '\0';
        str += cred.username;
        str += '\0';
        str += cred.token;
        return str;
    }

    challenge() {
    }
}

XOAuth2.prototype.name = 'X-OAUTH2';
XOAuth2.prototype.clientFirst = true;
