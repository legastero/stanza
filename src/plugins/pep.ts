import { Agent } from '../';
import { NS_ACTIVITY, NS_GEOLOC, NS_MOOD, NS_NICK, NS_PEP_NOTIFY, NS_TUNE } from '../Namespaces';
import { Geolocation, IQ, UserActivity, UserMood, UserNick, UserTune } from '../protocol';

declare module '../' {
    export interface Agent {
        publishActivity(data: UserActivity): Promise<IQ>;
        publishGeoLoc(data: Geolocation): Promise<IQ>;
        publishMood(mood: UserMood): Promise<IQ>;
        publishNick(nick: string): Promise<IQ>;
        publishTune(tune: UserTune): Promise<IQ>;
    }

    export interface AgentEvents {
        activity: UserActivityEvent;
        geoloc: UserLocationEvent;
        mood: UserMoodEvent;
        nick: UserNickEvent;
        tune: UserTuneEvent;
    }
}

export interface UserActivityEvent {
    jid: string;
    activity: UserActivity;
}

export interface UserTuneEvent {
    tune: UserTune;
    jid: string;
}

export interface UserNickEvent {
    jid: string;
    nick?: string;
}

export interface UserMoodEvent {
    jid: string;
    mood?: UserMood;
}

export interface UserLocationEvent {
    geoloc: Geolocation;
    jid: string;
}

export default function (client: Agent) {
    client.disco.addFeature(NS_ACTIVITY);
    client.disco.addFeature(NS_GEOLOC);
    client.disco.addFeature(NS_MOOD);
    client.disco.addFeature(NS_NICK);
    client.disco.addFeature(NS_TUNE);

    client.disco.addFeature(NS_PEP_NOTIFY(NS_ACTIVITY));
    client.disco.addFeature(NS_PEP_NOTIFY(NS_GEOLOC));
    client.disco.addFeature(NS_PEP_NOTIFY(NS_MOOD));
    client.disco.addFeature(NS_PEP_NOTIFY(NS_NICK));
    client.disco.addFeature(NS_PEP_NOTIFY(NS_TUNE));

    client.publishActivity = (data: UserActivity): Promise<IQ> => {
        return client.publish('', NS_ACTIVITY, {
            itemType: NS_ACTIVITY,
            ...data
        });
    };

    client.publishGeoLoc = (data: Geolocation): Promise<IQ> => {
        return client.publish('', NS_GEOLOC, {
            itemType: NS_GEOLOC,
            ...data
        });
    };

    client.publishMood = (mood: UserMood) => {
        return client.publish('', NS_MOOD, {
            itemType: NS_MOOD,
            ...mood
        });
    };

    client.publishNick = (nick: string) => {
        return client.publish<UserNick>('', NS_NICK, {
            itemType: NS_NICK,
            nick
        });
    };

    client.publishTune = (tune: UserTune) => {
        return client.publish('', NS_TUNE, {
            itemType: NS_TUNE,
            ...tune
        });
    };

    client.on('pubsub:published', msg => {
        const content = msg.pubsub.items.published[0].content;
        switch (msg.pubsub.items.node) {
            case NS_ACTIVITY:
                return client.emit('activity', {
                    activity: content as UserActivity,
                    jid: msg.from
                });
            case NS_GEOLOC:
                return client.emit('geoloc', {
                    geoloc: content as Geolocation,
                    jid: msg.from
                });
            case NS_MOOD:
                return client.emit('mood', {
                    jid: msg.from,
                    mood: content as UserMood
                });
            case NS_NICK:
                return client.emit('nick', {
                    jid: msg.from,
                    nick: (content as UserNick).nick
                });
            case NS_TUNE:
                return client.emit('tune', {
                    jid: msg.from,
                    tune: msg.pubsub.items.published[0].content as UserTune
                });
        }
    });
}
