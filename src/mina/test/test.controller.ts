import { Controller, Get } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Network } from '../network/network';
// import { Field, Group, PublicKey } from 'o1js';
import { CommitteeService } from '../committee/committee.service';
import { Model } from 'mongoose';
import { CommitteeAction } from 'src/schemas/committee-action.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Ipfs } from 'src/ipfs/ipfs';
import {
    AccountUpdate,
    Encoding,
    Field,
    Mina,
    Poseidon,
    PublicKey,
    Reducer,
} from 'o1js';
import { Utilities } from '../utilities';
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
        // await this.ipfs.upload({ name: 'hello' });
        // await this.ipfs.get('QmNtgQnzXReBiqLeu37XchvBSKra6dwgDgNbWKSJMeH285');
        // const actions = await this.committeeService.fetchActions();
        // await this.committeeService.fetchAllActions();
        const actions = await this.queryService.fetchActions(
            process.env.COMMITTEE_ADDRESS,
        );
        await this.committeeService.fetchAllActions();
        await this.committeeService.updateCommittees();
        // console.log(actions[0].actions);
        // console.log(
        //     Utilities.getNextActionState(
        //         Reducer.initialActionState,
        //         Utilities.getActionHash(
        //             Utilities.stringArrayToFields(
        //                 actions[actions.length - 1].actions,
        //             ),
        //         ),
        //     ).toString(),
        // );
        // console.log(
        //     Utilities.getNextActionState(
        //         Field.from(actions[actions.length - 1].hash),
        //         Utilities.getActionHash(
        //             Utilities.stringArrayToFields(
        //                 actions[actions.length - 2].actions,
        //             ),
        //         ),
        //     ).toString(),
        // );
    }

    @Get('/test3')
    async test3(): Promise<void> {
        const rawEvents = await this.queryService.fetchEvents(
            'B62qkD3nDk511bJw9sD3dkf9EWCc9FxHhm9DMFrwXk9pjxH4URmAsT8',
        );
        console.log(rawEvents[0].events);
    }
}
