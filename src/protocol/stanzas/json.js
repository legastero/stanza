import * as NS from '../namespaces';

export default function(JXT) {
    const JSONExtension = {
        get: function() {
            const data = JXT.utils.getSubText(this.xml, NS.JSON_0, 'json');
            if (data) {
                return JSON.parse(data);
            }
        },
        set: function(value) {
            value = JSON.stringify(value);
            if (value) {
                JXT.utils.setSubText(this.xml, NS.JSON_0, 'json', value);
            }
        }
    };

    JXT.withMessage(function(Message) {
        JXT.add(Message, 'json', JSONExtension);
    });

    JXT.withPubsubItem(function(Item) {
        JXT.add(Item, 'json', JSONExtension);
    });
}
