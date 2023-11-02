import { Injectable } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Field, Group, PublicKey } from 'o1js';
import { CommitteeState } from '../interfaces/committee-state.interface';
import { Committee } from 'src/schemas/committee.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class CommitteeService {
    constructor(
        private readonly queryService: QueryService,
        @InjectModel(Committee.name) private committeeModel: Model<Committee>,
    ) {}

    async getState(): Promise<CommitteeState> {
        const state = await this.queryService.fetchZkAppState(
            process.env.COMMITTEE_ADDRESS,
        );
        const committeeState: CommitteeState = {
            memberTreeRoot: state[0],
            settingTreeRoot: state[1],
            nextCommitteeId: state[2],
        };
        return committeeState;
    }

    async fetchEvents(): Promise<void> {
        const rawEvents = await this.queryService.fetchEvents(
            process.env.COMMITTEE_ADDRESS,
        );
        let committeeId = 0;
        for (let i = 0; i < rawEvents.length; i++) {
            const events = rawEvents[i].events;
            for (let i = 0; i < events.length; i++) {
                const data = events[i].data;
                const eventType = Number(Field.from(data[0]).toString());
                if (eventType == 0) {
                    const addressesLength = Number(
                        Field.from(data[1]).toString(),
                    );
                    const publicKeys: string[] = [];
                    for (let i = 0; i < addressesLength; i++) {
                        const x = data[2 + i * 2];
                        const y = data[2 + i * 2 + 1];
                        const publicKey = PublicKey.fromGroup(Group.from(x, y));
                        publicKeys.push(publicKey.toBase58());
                    }
                    const threshold = Field.from(data[2 + 32 * 2]);
                    // console.log('n', addressesLength);
                    // console.log('t', threshold);
                    // console.log('Committee members ', publicKeys);
                    await this.committeeModel.findOneAndUpdate(
                        { committeeId: committeeId.toString() },
                        {
                            committeeId: committeeId.toString(),
                            numberOfMembers: addressesLength.toString(),
                            threshold: threshold.toString(),
                            publicKeys: publicKeys,
                        },
                        { new: true, upsert: true },
                    );
                    committeeId += 1;
                }
            }
        }
    }
}
