import { Injectable } from '@nestjs/common';
import {
    Field,
    Mina,
    PublicKey,
    UInt32,
    UInt64,
    fetchAccount,
    fetchEvents,
} from 'o1js';
import { Event } from '../interfaces/event.interface';

@Injectable()
export class QueryService {
    constructor() {}

    async fetchEvents(
        publicKey: string,
        from?: number,
        to?: number,
    ): Promise<Event[]> {
        const events = await fetchEvents(
            {
                publicKey: publicKey,
            },
            undefined,
            {
                from: from == undefined ? undefined : UInt32.from(from),
                to: to == undefined ? undefined : UInt32.from(to),
            },
        );
        return events;
    }

    async fetchAccountBalance(publicKey: string): Promise<UInt64> {
        await fetchAccount({
            publicKey: publicKey,
        });
        const account = Mina.getAccount(PublicKey.fromBase58(publicKey));
        return account.balance;
    }

    async fetchZkAppState(publicKey: string): Promise<Field[]> {
        const result = await fetchAccount({
            publicKey: publicKey,
        });
        const account = result.account;
        return account.zkapp?.appState;
    }
}
