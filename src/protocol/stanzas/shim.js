import * as NS from '../namespaces';


export default function (JXT) {

    const Utils = JXT.utils;

    const SHIM = {
        get: function () {

            const headerSet = Utils.find(this.xml, NS.SHIM, 'headers');
            if (headerSet.length) {
                return Utils.getMultiSubText(headerSet[0], NS.SHIM, 'header', function (header) {

                    const name = Utils.getAttribute(header, 'name');
                    if (name) {
                        return {
                            name: name,
                            value: Utils.getText(header)
                        };
                    }
                });
            }
            return [];
        },
        set: function (values) {

            const headerSet = Utils.findOrCreate(this.xml, NS.SHIM, 'headers');
            JXT.setMultiSubText(headerSet, NS.SHIM, 'header', values, function (val) {

                const header = Utils.createElement(NS.SHIM, 'header', NS.SHIM);
                Utils.setAttribute(header, 'name', val.name);
                Utils.setText(header, val.value);
                headerSet.appendChild(header);
            });
        }
    };


    JXT.withMessage(function (Message) {

        JXT.add(Message, 'headers', SHIM);
    });

    JXT.withPresence(function (Presence) {

        JXT.add(Presence, 'headers', SHIM);
    });
}
