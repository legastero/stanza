export const SessionRole = {
    Initiator: 'initiator',
    Responder: 'responder'
} as const;

export const ApplicationDirection = {
    Inactive: 'inactive',
    Receive: 'recvonly',
    Send: 'sendonly',
    SendReceive: 'sendrecv'
} as const;

export const ContentSenders = {
    Both: 'both',
    Initiator: 'initiator',
    None: 'none',
    Responder: 'responder'
} as const;

export const Action = {
    ContentAccept: 'content-accept',
    ContentAdd: 'content-add',
    ContentModify: 'content-modify',
    ContentReject: 'content-reject',
    ContentRemove: 'content-remove',
    DescriptionInfo: 'description-info',
    SecurityInfo: 'security-info',
    SessionAccept: 'session-accept',
    SessionInfo: 'session-info',
    SessionInitiate: 'session-initiate',
    SessionTerminate: 'session-terminate',
    TransportAccept: 'transport-accept',
    TransportInfo: 'transport-info',
    TransportReject: 'transport-reject',
    TransportReplace: 'transport-replace'
} as const;

export const ReasonCondition = {
    AlternativeSession: 'alternative-session',
    Busy: 'busy',
    Cancel: 'cancel',
    ConnectivityError: 'connectivity-error',
    Decline: 'decline',
    Expired: 'expired',
    FailedApplication: 'failed-application',
    FailedTransport: 'failed-transport',
    GeneralError: 'general-error',
    Gone: 'gone',
    IncompatibleParameters: 'incompatible-parameters',
    MediaError: 'media-error',
    SecurityError: 'security-error',
    Success: 'success',
    Timeout: 'timeout',
    UnsupportedApplications: 'unsupported-applications',
    UnsupportedTransports: 'unsupported-transports'
} as const;

export type ApplicationDirection = (typeof ApplicationDirection)[keyof typeof ApplicationDirection];
export type ContentSenders = (typeof ContentSenders)[keyof typeof ContentSenders];
export type SessionRole = (typeof SessionRole)[keyof typeof SessionRole];
export type Action = (typeof Action)[keyof typeof Action];
export type ReasonCondition = (typeof ReasonCondition)[keyof typeof ReasonCondition];

export function sendersToDirection(
    role: SessionRole,
    senders: ContentSenders = 'both'
): ApplicationDirection {
    const isInitiator = role === SessionRole.Initiator;
    switch (senders) {
        case ContentSenders.Initiator:
            return isInitiator ? ApplicationDirection.Send : ApplicationDirection.Receive;
        case ContentSenders.Responder:
            return isInitiator ? ApplicationDirection.Receive : ApplicationDirection.Send;
        case ContentSenders.Both:
            return ApplicationDirection.SendReceive;
    }
    return ApplicationDirection.Inactive;
}

export function directionToSenders(
    role: SessionRole,
    direction: ApplicationDirection = 'sendrecv'
): ContentSenders {
    const isInitiator = role === SessionRole.Initiator;
    switch (direction) {
        case ApplicationDirection.Send:
            return isInitiator ? ContentSenders.Initiator : ContentSenders.Responder;
        case ApplicationDirection.Receive:
            return isInitiator ? ContentSenders.Responder : ContentSenders.Initiator;
        case ApplicationDirection.SendReceive:
            return ContentSenders.Both;
    }
    return ContentSenders.None;
}
