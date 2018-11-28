import * as NS from '../namespaces';

const TYPE_MAP = {
    erase: 'e',
    insert: 't',
    wait: 'w'
};

const ACTION_MAP = {
    e: 'erase',
    t: 'insert',
    w: 'wait'
};

export default function(JXT) {
    const Utils = JXT.utils;

    const RTT = JXT.define({
        element: 'rtt',
        fields: {
            actions: {
                get: function() {
                    const results = [];
                    for (let i = 0, len = this.xml.childNodes.length; i < len; i++) {
                        const child = this.xml.childNodes[i];
                        const name = child.localName;
                        const action = {};

                        if (child.namespaceURI !== NS.RTT_0) {
                            continue;
                        }

                        if (ACTION_MAP[name]) {
                            action.type = ACTION_MAP[name];
                        } else {
                            continue;
                        }

                        const pos = Utils.getAttribute(child, 'p');
                        if (pos) {
                            action.pos = parseInt(pos, 10);
                        }

                        const n = Utils.getAttribute(child, 'n');
                        if (n) {
                            action.num = parseInt(n, 10);
                        }

                        const t = Utils.getText(child);
                        if (t && name === 't') {
                            action.text = t;
                        }

                        results.push(action);
                    }

                    return results;
                },
                set: function(actions) {
                    const self = this;

                    for (let i = 0, len = this.xml.childNodes.length; i < len; i++) {
                        this.xml.removeChild(this.xml.childNodes[i]);
                    }

                    for (const action of actions) {
                        if (!TYPE_MAP[action.type]) {
                            return;
                        }

                        const child = Utils.createElement(
                            NS.RTT_0,
                            TYPE_MAP[action.type],
                            NS.RTT_0
                        );

                        if (action.pos !== undefined) {
                            Utils.setAttribute(child, 'p', action.pos.toString());
                        }

                        if (action.num) {
                            Utils.setAttribute(child, 'n', action.num.toString());
                        }

                        if (action.text) {
                            Utils.setText(child, action.text);
                        }

                        self.xml.appendChild(child);
                    }
                }
            },
            event: Utils.attribute('event', 'edit'),
            id: Utils.attribute('id'),
            seq: Utils.numberAttribute('seq')
        },
        name: 'rtt',
        namespace: NS.RTT_0
    });

    JXT.extendMessage(RTT);
}
