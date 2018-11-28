import * as NS from '../namespaces';

export default function(JXT) {
    const Utils = JXT.utils;

    const IBB = {
        get: function() {
            let data = Utils.find(this.xml, NS.IBB, 'data');
            if (data.length) {
                data = data[0];
                return {
                    action: 'data',
                    data: Buffer.from(Utils.getText(data), 'base64'),
                    seq: parseInt(Utils.getAttribute(data, 'seq') || '0', 10),
                    sid: Utils.getAttribute(data, 'sid')
                };
            }

            let open = Utils.find(this.xml, NS.IBB, 'open');
            if (open.length) {
                open = open[0];
                let ack = Utils.getAttribute(open, 'stanza');
                if (ack === 'message') {
                    ack = false;
                } else {
                    ack = true;
                }

                return {
                    ack: ack,
                    action: 'open',
                    blockSize: Utils.getAttribute(open, 'block-size'),
                    sid: Utils.getAttribute(open, 'sid')
                };
            }

            const close = Utils.find(this.xml, NS.IBB, 'close');
            if (close.length) {
                return {
                    action: 'close',
                    sid: Utils.getAttribute(close[0], 'sid')
                };
            }
        },
        set: function(value) {
            if (value.action === 'data') {
                const data = Utils.createElement(NS.IBB, 'data');
                Utils.setAttribute(data, 'sid', value.sid);
                Utils.setAttribute(data, 'seq', value.seq.toString());
                Utils.setText(data, value.data.toString('base64'));
                this.xml.appendChild(data);
            }

            if (value.action === 'open') {
                const open = Utils.createElement(NS.IBB, 'open');
                Utils.setAttribute(open, 'sid', value.sid);
                Utils.setAttribute(open, 'block-size', (value.blockSize || '4096').toString());
                if (value.ack === false) {
                    Utils.setAttribute(open, 'stanza', 'message');
                } else {
                    Utils.setAttribute(open, 'stanza', 'iq');
                }
                this.xml.appendChild(open);
            }

            if (value.action === 'close') {
                const close = Utils.createElement(NS.IBB, 'close');
                Utils.setAttribute(close, 'sid', value.sid);
                this.xml.appendChild(close);
            }
        }
    };

    const JingleIBB = JXT.define({
        element: 'transport',
        fields: {
            ack: {
                get: function() {
                    const value = Utils.getAttribute(this.xml, 'stanza');

                    if (value === 'message') {
                        return false;
                    }

                    return true;
                },
                set: function(value) {
                    if (value.ack === false) {
                        Utils.setAttribute(this.xml, 'stanza', 'message');
                    } else {
                        Utils.setAttribute(this.xml, 'stanza', 'iq');
                    }
                }
            },
            blockSize: Utils.numberAttribute('block-size'),
            sid: Utils.attribute('sid'),
            transportType: {
                value: NS.JINGLE_IBB_1,
                writable: true
            }
        },
        name: '_' + NS.JINGLE_IBB_1,
        namespace: NS.JINGLE_IBB_1,
        tags: ['jingle-transport']
    });

    JXT.withDefinition('content', NS.JINGLE_1, function(Content) {
        JXT.extend(Content, JingleIBB);
    });

    JXT.withIQ(function(IQ) {
        JXT.add(IQ, 'ibb', IBB);
    });

    JXT.withMessage(function(Message) {
        JXT.add(Message, 'ibb', IBB);
    });
}
