import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { GetTasksDto } from 'src/dtos/get-tasks.dto';
import { Task } from 'src/schemas/task.schema';

@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Get()
    @ApiTags('Task')
    @CacheTTL(30000)
    @UseInterceptors(CacheInterceptor)
    async getTasks(@Query() getTasksDto: GetTasksDto): Promise<Task[]> {
        return await this.tasksService.getTasks(getTasksDto);
    }
}
