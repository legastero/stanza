import * as NS from '../namespaces';

const CONDITIONS = ['out-of-order', 'tie-break', 'unknown-session', 'unsupported-info'];
const REASONS = [
    'alternative-session',
    'busy',
    'cancel',
    'connectivity-error',
    'decline',
    'expired',
    'failed-application',
    'failed-transport',
    'general-error',
    'gone',
    'incompatible-parameters',
    'media-error',
    'security-error',
    'success',
    'timeout',
    'unsupported-applications',
    'unsupported-transports'
];

export default function(JXT) {
    const Utils = JXT.utils;

    const Jingle = JXT.define({
        element: 'jingle',
        fields: {
            action: Utils.attribute('action'),
            info: {
                get: function() {
                    const opts = JXT.tagged('jingle-info').map(function(Info) {
                        return Info.prototype._name;
                    });

                    for (let i = 0, len = opts.length; i < len; i++) {
                        if (this._extensions[opts[i]]) {
                            return this._extensions[opts[i]];
                        }
                    }

                    if (Utils.getAttribute(this.xml, 'action') === 'session-info') {
                        if (this.xml.children.length === 0) {
                            return {
                                infoType: 'ping'
                            };
                        }

                        return {
                            infoType: 'unknown'
                        };
                    }
                },
                set: function(value) {
                    if (value.infoType === 'ping') {
                        return;
                    }

                    const ext = '_' + value.infoType;
                    this[ext] = value;
                }
            },
            initiator: Utils.attribute('initiator'),
            responder: Utils.attribute('responder'),
            sid: Utils.attribute('sid')
        },
        name: 'jingle',
        namespace: NS.JINGLE_1
    });

    const Content = JXT.define({
        element: 'content',
        fields: {
            application: {
                get: function() {
                    const opts = JXT.tagged('jingle-application').map(function(Description) {
                        return Description.prototype._name;
                    });

                    for (let i = 0, len = opts.length; i < len; i++) {
                        if (this._extensions[opts[i]]) {
                            return this._extensions[opts[i]];
                        }
                    }
                },
                set: function(value) {
                    const ext = '_' + value.applicationType;
                    this[ext] = value;
                }
            },
            creator: Utils.attribute('creator'),
            disposition: Utils.attribute('disposition', 'session'),
            name: Utils.attribute('name'),
            security: {
                get: function() {
                    const opts = JXT.tagged('jingle-security').map(function(Security) {
                        return Security.prototype._name;
                    });

                    for (let i = 0, len = opts.length; i < len; i++) {
                        if (this._extensions[opts[i]]) {
                            return this._extensions[opts[i]];
                        }
                    }
                },
                set: function(value) {
                    const ext = '_' + value.securityType;
                    this[ext] = value;
                }
            },
            senders: Utils.attribute('senders', 'both'),
            transport: {
                get: function() {
                    const opts = JXT.tagged('jingle-transport').map(function(Transport) {
                        return Transport.prototype._name;
                    });

                    for (let i = 0, len = opts.length; i < len; i++) {
                        if (this._extensions[opts[i]]) {
                            return this._extensions[opts[i]];
                        }
                    }
                },
                set: function(value) {
                    const ext = '_' + value.transportType;
                    this[ext] = value;
                }
            }
        },
        name: '_jingleContent',
        namespace: NS.JINGLE_1
    });

    const Reason = JXT.define({
        element: 'reason',
        fields: {
            alternativeSession: {
                get: function() {
                    return Utils.getSubText(this.xml, NS.JINGLE_1, 'alternative-session');
                },
                set: function(value) {
                    this.condition = 'alternative-session';
                    Utils.setSubText(this.xml, NS.JINGLE_1, 'alternative-session', value);
                }
            },
            condition: Utils.enumSub(NS.JINGLE_1, REASONS),
            text: Utils.textSub(NS.JINGLE_1, 'text')
        },
        name: 'reason',
        namespace: NS.JINGLE_1
    });

    JXT.extend(Jingle, Content, 'contents');
    JXT.extend(Jingle, Reason);

    JXT.extendIQ(Jingle);

    JXT.withStanzaError(function(StanzaError) {
        JXT.add(StanzaError, 'jingleCondition', Utils.enumSub(NS.JINGLE_ERRORS_1, CONDITIONS));
    });
}
