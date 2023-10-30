import { Module } from '@nestjs/common';
import { Network } from './network/network';
import { TasksService } from './tasks/tasks.service';
import { QueryService } from './query/query.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [ScheduleModule.forRoot()],
    providers: [Network, TasksService, QueryService],
})
export class MinaModule {}
