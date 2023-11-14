import { Controller, Get } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Network } from '../network/network';
// import { Field, Group, PublicKey } from 'o1js';
import { CommitteeService } from '../committee/committee.service';
import { Model } from 'mongoose';
import { CommitteeAction } from 'src/schemas/committee-action.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Ipfs } from 'src/ipfs/ipfs';
import { Encoding, Field, PublicKey } from 'o1js';
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
        await this.committeeService.fetchCommitteeCreatedEvents();
    }

    @Get('/test3')
    async test3(): Promise<void> {
        // await this.committeeService.fetchCommitteeCreatedEvents();
        // const rawEvents = await this.queryService.fetchEvents(
        //     'B62qjPatWc5jvdVgKXwNwKSjeyX7wa3SrCDof9Yxpeiuz4GoEyQjryN',
        // );
        // const data = rawEvents[2].events[0].data;
        // console.log(data);
        // [
        //     Field.from(data[35]),
        //     Field.from(data[36]),
        //     Field.from(data[37]),
        //     Field.from(data[38]),
        // ];
        // console.log(
        //     Encoding.stringFromFields([
        //         Field.from(data[36]),
        //         Field.from(data[37]),
        //     ]),
        // );
    }
}
