import { Controller, Get } from '@nestjs/common';
import { QueryService } from '../query/query.service';
import { Network } from '../network/network';

@Controller('test')
export class TestController {
    constructor(
        private readonly network: Network,
        private readonly queryService: QueryService,
    ) {}

    @Get()
    async test(): Promise<any> {
        const test: any = await this.queryService.fetchAccountBalance(
            'B62qpFjxh9vFPmigzmBSrGepDjBz87UQH2bzFXNEZu64YCQzEaxmQWH',
        );
        return test;
    }
}
