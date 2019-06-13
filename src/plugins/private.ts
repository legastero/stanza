import { Agent } from '../';
import { IQ, PrivateStorage } from '../protocol';

declare module '../' {
    export interface Agent {
        getPrivateData<T extends keyof PrivateStorage>(key: T): Promise<PrivateStorage[T]>;
        setPrivateData<T extends keyof PrivateStorage>(
            key: T,
            data: PrivateStorage[T]
        ): Promise<IQ>;
    }
}

export default function(client: Agent) {
    client.getPrivateData = async (key: keyof PrivateStorage) => {
        const res = await client.sendIQ({
            privateStorage: {
                [key]: {}
            },
            type: 'get'
        });

        return res.privateStorage[key];
    };

    client.setPrivateData = async <T extends keyof PrivateStorage>(
        key: T,
        value: PrivateStorage[T]
    ) => {
        return client.sendIQ({
            privateStorage: {
                [key]: value
            },
            type: 'set'
        });
    };
}
