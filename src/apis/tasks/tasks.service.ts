import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GetTasksDto } from 'src/dtos/get-tasks.dto';
import { Task } from 'src/schemas/task.schema';

@Injectable()
export class TasksService {
    constructor(
        @InjectModel(Task.name) private readonly taskModel: Model<Task>,
    ) {}

    async getTasks(getTasksDto: GetTasksDto): Promise<Task[]> {
        if (getTasksDto.keyIndex != undefined) {
            return await this.taskModel.find({
                requester: getTasksDto.requester,
                keyIndex: getTasksDto.keyIndex,
            });
        } else {
            return await this.taskModel.find({
                requester: getTasksDto.requester,
            });
        }
    }
}
