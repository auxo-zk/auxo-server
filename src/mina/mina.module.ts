import { Module } from '@nestjs/common';
import { Network } from './network/network';
import { TasksService } from './tasks/tasks.service';
import { QueryService } from './query/query.service';

@Module({
    providers: [Network, TasksService, QueryService],
})
export class MinaModule {}
