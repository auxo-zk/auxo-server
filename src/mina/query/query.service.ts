import { Injectable } from '@nestjs/common';
import {
    Field,
    Mina,
    PublicKey,
    UInt64,
    fetchAccount,
    fetchEvents,
} from 'o1js';
import { Event } from '../interfaces/event.interface';

@Injectable()
export class QueryService {
    constructor() {}

    async fetchEvents(publicKey: string): Promise<Event[]> {
        const events = await fetchEvents({
            publicKey: publicKey,
        });
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
        await fetchAccount({
            publicKey: publicKey,
        });
        const account = Mina.getAccount(PublicKey.fromBase58(publicKey));
        return account.zkapp.appState;
    }
}
