export const SessionRole = {
    Initiator: 'initiator' as 'initiator',
    Responder: 'responder' as 'responder'
};

export const ApplicationDirection = {
    Inactive: 'inactive' as 'inactive',
    Receive: 'recvonly' as 'recvonly',
    Send: 'sendonly' as 'sendonly',
    SendReceive: 'sendrecv' as 'sendrecv'
};

export const ContentSenders = {
    Both: 'both' as 'both',
    Initiator: 'initiator' as 'initiator',
    None: 'none' as 'none',
    Responder: 'responder' as 'responder'
};

export type ApplicationDirection = (typeof ApplicationDirection)[keyof typeof ApplicationDirection];
export type ContentSenders = (typeof ContentSenders)[keyof typeof ContentSenders];
export type SessionRole = (typeof SessionRole)[keyof typeof SessionRole];

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
