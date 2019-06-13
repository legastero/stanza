import { Agent } from '../';
import { IQ } from '../protocol';

declare module '../' {
    export interface Agent {
        goInvisible(probe?: boolean): Promise<void>;
        goVisible(): Promise<void>;
    }
}

export default function(client: Agent) {
    client.goInvisible = async (probe?: boolean) => {
        await client.sendIQ({
            type: 'set',
            visiblity: {
                probe,
                type: 'invisible'
            }
        });
    };

    client.goVisible = async () => {
        await client.sendIQ({
            type: 'set',
            visiblity: {
                type: 'visible'
            }
        });
    };
}
