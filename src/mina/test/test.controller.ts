import { Controller, Get } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Network } from '../network/network';
// import { Field, Group, PublicKey } from 'o1js';
import { CommitteeService } from '../committee/committee.service';

@Controller('test')
export class TestController {
    constructor(
        private readonly network: Network,
        private readonly queryService: QueryService,
        private readonly committeeService: CommitteeService,
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
        await this.committeeService.merkleTree();
        // try {
        //     await fetchLastBlock();
        // } catch (err) {
        //     console.log(err);
        // }
    }
}
