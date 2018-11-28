import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const Properties = {
        get: function() {
            const results = {};
            const props = Utils.find(this.xml, NS.XRD, 'Property');

            for (let i = 0, len = props.length; i < len; i++) {
                const property = props[i];
                const type = Utils.getAttribute(property, 'type');
                results[type] = property.textContent;
            }

            return results;
        }
    };

    const XRD = JXT.define({
        element: 'XRD',
        fields: {
            aliases: Utils.multiSubText(NS.XRD, 'Alias'),
            expires: Utils.dateSub(NS.XRD, 'Expires'),
            properties: Properties,
            subject: Utils.subText(NS.XRD, 'Subject')
        },
        name: 'xrd',
        namespace: NS.XRD
    });

    const Link = JXT.define({
        element: 'Link',
        fields: {
            href: Utils.attribute('href'),
            properties: Properties,
            rel: Utils.attribute('rel'),
            template: Utils.attribute('template'),
            titles: Utils.subLangText(NS.XRD, 'Title', 'default'),
            type: Utils.attribute('type')
        },
        name: '_xrdlink',
        namespace: NS.XRD
    });

    JXT.extend(XRD, Link, 'links');
}
