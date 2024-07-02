import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Query,
    UseInterceptors,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ApiTags } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { GetTasksDto } from 'src/dtos/get-tasks.dto';
import { Task } from 'src/schemas/task.schema';
import { DkgRequest } from 'src/schemas/request.schema';

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

    @Get(':taskId/request')
    @ApiTags('Task')
    async getRequest(
        @Param('taskId', ParseIntPipe) taskId: number,
        @Query('requester') requester: string,
    ): Promise<DkgRequest> {
        return await this.tasksService.getRequest(taskId, requester);
    }
}
