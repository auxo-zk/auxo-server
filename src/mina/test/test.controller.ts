import { Controller, Get } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Network } from '../network/network';
// import { Field, Group, PublicKey } from 'o1js';
import { CommitteeService } from '../committee/committee.service';
import { Model } from 'mongoose';
import { CommitteeAction } from 'src/schemas/actions/committee-action.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Ipfs } from 'src/ipfs/ipfs';
import {
    AccountUpdate,
    Encoding,
    Field,
    Mina,
    Poseidon,
    PrivateKey,
    PublicKey,
    Reducer,
} from 'o1js';
import { Utilities } from '../utilities';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { getDkg } from 'src/schemas/actions/dkg-action.schema';
// import { getRound1 } from 'src/schemas/actions/round-1-action.schema';
// import { Point } from 'src/schemas/key.schema';

@Controller('test')
export class TestController {
    constructor(
        private readonly network: Network,
        private readonly queryService: QueryService,
        private readonly committeeService: CommitteeService,
        @InjectModel(CommitteeAction.name)
        private committeeActionModel: Model<CommitteeAction>,
        private readonly ipfs: Ipfs,
        @InjectQueue('rollup-committee')
        private readonly rollupCommitteeQueue: Queue,
    ) {}

    @Get('/test1')
    async test1(): Promise<any> {
        const test: any = await this.queryService.fetchAccountBalance(
            'B62qpFjxh9vFPmigzmBSrGepDjBz87UQH2bzFXNEZu64YCQzEaxmQWH',
        );
        return test;
    }

    @Get('/test2')
    async test2(): Promise<any> {
        // const rawActions = await this.queryService.fetchActions(
        //     process.env.ROUND_1_ADDRESS,
        // );
        // for (let i = 0; i < rawActions.length; i++) {
        //     const actions = rawActions[i].actions[0];
        //     console.log(getRound1(actions));
        // }
    }

    @Get('/test3')
    async test3(): Promise<void> {
        const rawEvents = await this.queryService.fetchEvents(
            'B62qkD3nDk511bJw9sD3dkf9EWCc9FxHhm9DMFrwXk9pjxH4URmAsT8',
        );
        console.log(rawEvents[rawEvents.length - 1].events);
    }
}
