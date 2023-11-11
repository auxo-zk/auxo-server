import { Controller, Get } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Network } from '../network/network';
// import { Field, Group, PublicKey } from 'o1js';
import { CommitteeService } from '../committee/committee.service';
import { Model } from 'mongoose';
import { CommitteeAction, Point } from 'src/schemas/committee-action.schema';
import { InjectModel } from '@nestjs/mongoose';

@Controller('test')
export class TestController {
    constructor(
        private readonly network: Network,
        private readonly queryService: QueryService,
        private readonly committeeService: CommitteeService,
        @InjectModel(CommitteeAction.name)
        private committeeActionModel: Model<CommitteeAction>,
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
        const test = await this.queryService.fetchEvents(
            'B62qkXcmKqReciooAM5gCXQbgUv6DY32nE5J1vXpsWSq8hUEGBhkgUC',
        );
        return test;
    }

    @Get('/test3')
    async test3(): Promise<void> {
        // await this.committeeService.merkleTree();
        // console.log(this.committeeService.state);
        // await this.committeeService.fetchCommitteeCreatedEvents();
        // await this.committeeService.updateMerkleTrees();
        const newCommitteeAction = new this.committeeActionModel({
            committeeActionId: '5',
            actionEnum: 1,
            committeeId: 1,
            keyId: 1,
            round1Contribution: [new Point('1', '2'), new Point('3', '4')],
            round2Contribution: { c: '1', u: new Point('1', '2') },
            responseContribution: [new Point('1', '2'), new Point('3', '4')],
        });
        await newCommitteeAction.save();
        //round2Contribution: { c: '1', u: new Point('1', '2') },
    }
}
