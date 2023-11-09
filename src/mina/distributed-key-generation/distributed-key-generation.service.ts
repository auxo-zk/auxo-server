import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { InjectModel } from '@nestjs/mongoose';
import { CommitteeAction } from 'src/schemas/committee-action.schema';
import { Model } from 'mongoose';
import { Field } from 'o1js';

@Injectable()
export class DistributedKeyGenerationService implements OnModuleInit {
    constructor(
        private readonly queryService: QueryService,
        @InjectModel(CommitteeAction.name)
        private committeeActionModel: Model<CommitteeAction>,
    ) {}

    async onModuleInit() {}

    async getZkAppState() {}

    async fetchCommitteeActionEvents(fetchAll?: boolean) {
        let lastCommitteeAction: CommitteeAction = null;
        if (!fetchAll) {
            lastCommitteeAction = await this.committeeActionModel.findOne(
                {},
                {},
                { sort: { blockHeight: -1 } },
            );
        }
        const rawEvents = await this.queryService.fetchEvents(
            process.env.DISTRIBUTED_KEY_GENERATION_ADDRESS,
            lastCommitteeAction == null
                ? undefined
                : lastCommitteeAction.blockHeight + 1,
        );
        for (let i = 0; i < rawEvents.length; i++) {
            const events = rawEvents[i].events;
            // const blockHeight = rawEvents[i].blockHeight;
            for (let j = 0; j < events.length; j++) {
                const data = events[i].data;
                const eventType = Number(Field.from(data[0]).toString());
                if (eventType == 0) {
                }
            }
        }
    }
}
