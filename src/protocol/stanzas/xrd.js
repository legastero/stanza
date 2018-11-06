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
        name: 'xrd',
        namespace: NS.XRD,
        element: 'XRD',
        fields: {
            subject: Utils.subText(NS.XRD, 'Subject'),
            expires: Utils.dateSub(NS.XRD, 'Expires'),
            aliases: Utils.multiSubText(NS.XRD, 'Alias'),
            properties: Properties
        }
    });

    const Link = JXT.define({
        name: '_xrdlink',
        namespace: NS.XRD,
        element: 'Link',
        fields: {
            rel: Utils.attribute('rel'),
            href: Utils.attribute('href'),
            type: Utils.attribute('type'),
            template: Utils.attribute('template'),
            titles: Utils.subLangText(NS.XRD, 'Title', 'default'),
            properties: Properties
        }
    });

    JXT.extend(XRD, Link, 'links');
}
