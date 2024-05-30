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
        console.log(getTasksDto);
        if (getTasksDto.keyIndex != undefined) {
            if (getTasksDto.hasRequest == true) {
                return await this.taskModel.aggregate([
                    {
                        $match: {
                            requester: String(getTasksDto.requester),
                            keyIndex: Number(getTasksDto.keyIndex),
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'request',
                            localField: 'task',
                            foreignField: 'task',
                        },
                    },
                    {
                        $match: {
                            'request.0': { $exists: true },
                        },
                    },
                    {
                        $unwind: {
                            path: '$request',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                ]);
            } else if (getTasksDto.hasRequest == false) {
                return await this.taskModel.aggregate([
                    {
                        $match: {
                            requester: String(getTasksDto.requester),
                            keyIndex: Number(getTasksDto.keyIndex),
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'request',
                            localField: 'task',
                            foreignField: 'task',
                        },
                    },
                    {
                        $match: {
                            request: { $eq: [] },
                        },
                    },
                    {
                        $unwind: {
                            path: '$request',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                ]);
            } else {
                return await this.taskModel.aggregate([
                    {
                        $match: {
                            requester: String(getTasksDto.requester),
                            keyIndex: Number(getTasksDto.keyIndex),
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'request',
                            localField: 'task',
                            foreignField: 'task',
                        },
                    },
                    {
                        $unwind: {
                            path: '$request',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                ]);
            }
        } else {
            if (getTasksDto.hasRequest == true) {
                return await this.taskModel.aggregate([
                    {
                        $match: {
                            requester: String(getTasksDto.requester),
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'request',
                            localField: 'task',
                            foreignField: 'task',
                        },
                    },
                    {
                        $match: {
                            'request.0': { $exists: true },
                        },
                    },
                    {
                        $unwind: {
                            path: '$request',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                ]);
            } else if (getTasksDto.hasRequest == false) {
                console.log('ere');
                return await this.taskModel.aggregate([
                    {
                        $match: {
                            requester: String(getTasksDto.requester),
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'request',
                            localField: 'task',
                            foreignField: 'task',
                        },
                    },
                    {
                        $match: {
                            request: { $eq: [] },
                        },
                    },
                    {
                        $unwind: {
                            path: '$request',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                ]);
            } else {
                return await this.taskModel.aggregate([
                    {
                        $match: {
                            requester: String(getTasksDto.requester),
                        },
                    },
                    {
                        $lookup: {
                            from: 'dkgrequests',
                            as: 'request',
                            localField: 'task',
                            foreignField: 'task',
                        },
                    },
                    {
                        $unwind: {
                            path: '$request',
                            preserveNullAndEmptyArrays: true, // Optional: keep orders with no matching product
                        },
                    },
                ]);
            }
        }
    }
}
