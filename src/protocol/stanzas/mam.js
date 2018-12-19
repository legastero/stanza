import * as NS from '../namespaces';
import { JID } from '../jid';

export default function(JXT) {
    const Utils = JXT.utils;

    const MAMQuery = JXT.define({
        element: 'query',
        fields: {
            node: Utils.attribute('node'),
            queryid: Utils.attribute('queryid')
        },
        name: 'mam',
        namespace: NS.MAM_2
    });

    const Result = JXT.define({
        element: 'result',
        fields: {
            id: Utils.attribute('id'),
            queryid: Utils.attribute('queryid')
        },
        name: 'mamItem',
        namespace: NS.MAM_2
    });

    const Fin = JXT.define({
        element: 'fin',
        fields: {
            complete: Utils.boolAttribute('complete'),
            stable: Utils.boolAttribute('stable')
        },
        name: 'mamResult',
        namespace: NS.MAM_2
    });

    const Prefs = JXT.define({
        element: 'prefs',
        fields: {
            always: {
                get: function() {
                    const results = [];
                    let container = Utils.find(this.xml, NS.MAM_2, 'always');

                    if (container.length === 0) {
                        return results;
                    }

                    container = container[0];
                    const jids = Utils.getMultiSubText(container, NS.MAM_2, 'jid');

                    for (const jid of jids) {
                        results.push(new JID(jid.textContent));
                    }

                    return results;
                },
                set: function(value) {
                    if (value.length > 0) {
                        const container = Utils.findOrCreate(this.xml, NS.MAM_2, 'always');
                        Utils.setMultiSubText(container, NS.MAM_2, 'jid', value);
                    }
                }
            },
            defaultCondition: Utils.attribute('default'),
            never: {
                get: function() {
                    const results = [];
                    let container = Utils.find(this.xml, NS.MAM_2, 'always');

                    if (container.length === 0) {
                        return results;
                    }

                    container = container[0];
                    const jids = Utils.getMultiSubText(container, NS.MAM_2, 'jid');

                    for (const jid of jids) {
                        results.push(new JID(jid.textContent));
                    }

                    return results;
                },
                set: function(value) {
                    if (value.length > 0) {
                        const container = Utils.findOrCreate(this.xml, NS.MAM_2, 'never');
                        Utils.setMultiSubText(container, NS.MAM_2, 'jid', value);
                    }
                }
            }
        },
        name: 'mamPrefs',
        namespace: NS.MAM_2
    });

    JXT.extendMessage(Result);

    JXT.extendIQ(MAMQuery);
    JXT.extendIQ(Prefs);
    JXT.extendIQ(Fin);

    JXT.withDataForm(function(DataForm) {
        JXT.extend(MAMQuery, DataForm);
    });

    JXT.withDefinition('forwarded', NS.FORWARD_0, function(Forwarded) {
        JXT.extend(Result, Forwarded);
    });

    JXT.withDefinition('set', NS.RSM, function(RSM) {
        JXT.extend(MAMQuery, RSM);
        JXT.extend(Fin, RSM);
    });
}
