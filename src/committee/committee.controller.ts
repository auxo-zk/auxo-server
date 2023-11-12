import { Controller, Get, HttpStatus, Param, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Model } from 'mongoose';
import { Committee } from 'src/schemas/committee.schema';

@Controller('committee')
export class CommitteeController {
    constructor(
        @InjectModel(Committee.name) private committeeModel: Model<Committee>,
    ) {}

    @Get()
    @ApiTags('Committee')
    async getAllCommittees(): Promise<Committee[]> {
        return this.committeeModel.find({});
    }

    @Get(':committeeId')
    @ApiTags('Committee')
    async getCommittee(
        @Param('committeeId') committeeId: number,
        @Res() response: Response,
    ): Promise<Committee> {
        const result = await this.committeeModel.findOne({
            committeeId: committeeId,
        });
        if (result == null) {
            response.status(HttpStatus.NOT_FOUND);
        }
        response.send(result);
        return result;
    }
}
