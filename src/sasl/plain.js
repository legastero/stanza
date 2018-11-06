export default class Plain {
    response(cred) {
        var str = '';
        str += cred.authzid || '';
        str += '\0';
        str += cred.username;
        str += '\0';
        str += cred.password;
        return str;
    }

    challenge() {
        return this;
    }
}
  
Plain.prototype.name = 'PLAIN';
Plain.prototype.clientFirst = true;
