import { Controller, Get } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Network } from '../network/network';
import { Field, Group, PublicKey } from 'o1js';

@Controller('test')
export class TestController {
    constructor(
        private readonly network: Network,
        private readonly queryService: QueryService,
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
        const event = test[0];
        const data = event.events[0].data;
        const addressesLength = Number(data[1]);
        let committeeLength = 0;
        for (let i = 0; i < addressesLength; i++) {
            const x = data[2 + i * 2];
            const y = data[2 + i * 2 + 1];
            if (Number(x) != 0 && Number(y) != 0) {
                const publicKey = PublicKey.fromGroup(Group.from(x, y));
                console.log(publicKey.toBase58());
                committeeLength += 1;
            }
        }
        const threshold = Field.from(data[1 + 1 + addressesLength * 2]);
        console.log(
            'Committee length and threshold: ' +
                committeeLength +
                ' ' +
                threshold.toString(),
        );
        // const test: any = await this.queryService.fetchEvents(
        //     'B62qkXcmKqReciooAM5gCXQbgUv6DY32nE5J1vXpsWSq8hUEGBhkgUC',
        // );
        // B62qm93PJGhaiowrgdA5tnMHAu98RzjJdHb9GMc67KdQYxMdWeUFh79
        return test;
    }
}
