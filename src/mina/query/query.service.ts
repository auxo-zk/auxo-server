import { Injectable } from '@nestjs/common';
import { Account, PublicKey, fetchEvents } from 'o1js';
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

    async fetchAccountBalance(publicKey: string) {
        const account = Account(PublicKey.fromBase58(publicKey));
        return account.balance;
    }
}
