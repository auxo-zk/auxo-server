import { Injectable } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Field, Group, PublicKey } from 'o1js';

@Injectable()
export class CommitteeService {
    constructor(private readonly queryService: QueryService) {}

    async fetchEvents(): Promise<void> {
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
        );
        for (let i = 0; i < rawEvents.length; i++) {
            const events = rawEvents[i].events;
            for (let i = 0; i < events.length; i++) {
                const data = events[i].data;
                const eventType = Number(Field.from(data[0]).toString());
                if (eventType == 0) {
                    const addressesLength = Number(
                        Field.from(data[1]).toString(),
                    );
                    const publicKeys: PublicKey[] = [];
                    for (let i = 0; i < addressesLength; i++) {
                        const x = data[2 + i * 2];
                        const y = data[2 + i * 2 + 1];
                        const publicKey = PublicKey.fromGroup(Group.from(x, y));
                        publicKeys.push(publicKey);
                    }
                    const threshold = Field.from(data[2 + addressesLength]);
                    console.log('n', addressesLength);
                    console.log('t', threshold);
                    console.log('Committee members ', publicKeys);
                }
            }
        }
    }
}
