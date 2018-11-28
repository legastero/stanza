import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Register = JXT.define({
        element: 'query',
        fields: {
            address: Utils.textSub(NS.REGISTER, 'address'),
            city: Utils.textSub(NS.REGISTER, 'city'),
            date: Utils.textSub(NS.REGISTER, 'date'),
            email: Utils.textSub(NS.REGISTER, 'email'),
            first: Utils.textSub(NS.REGISTER, 'first'),
            instructions: Utils.textSub(NS.REGISTER, 'instructions'),
            key: Utils.textSub(NS.REGISTER, 'key'),
            last: Utils.textSub(NS.REGISTER, 'last'),
            misc: Utils.textSub(NS.REGISTER, 'misc'),
            name: Utils.textSub(NS.REGISTER, 'name'),
            nick: Utils.textSub(NS.REGISTER, 'nick'),
            password: Utils.textSub(NS.REGISTER, 'password'),
            phone: Utils.textSub(NS.REGISTER, 'phone'),
            registered: Utils.boolSub(NS.REGISTER, 'registered'),
            remove: Utils.boolSub(NS.REGISTER, 'remove'),
            state: Utils.textSub(NS.REGISTER, 'state'),
            text: Utils.textSub(NS.REGISTER, 'text'),
            url: Utils.textSub(NS.REGISTER, 'url'),
            username: Utils.textSub(NS.REGISTER, 'username'),
            zip: Utils.textSub(NS.REGISTER, 'zip')
        },
        name: 'register',
        namespace: NS.REGISTER
    });

    JXT.extendIQ(Register);

    JXT.withDefinition('x', NS.OOB, function(OOB) {
        JXT.extend(Register, OOB);
    });

    JXT.withDataForm(function(DataForm) {
        JXT.extend(Register, DataForm);
    });
}
