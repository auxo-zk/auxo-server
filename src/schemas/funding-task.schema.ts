import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RequestStatusEnum } from 'src/constants';

export class Encryption {
    timestamp: number;
    indices: string;
    R: { x: string; y: string }[];
    M: { x: string; y: string }[];
    commitments: string[];

    constructor(
        timestamp: number,
        indices: string,
        R: { x: string; y: string }[],
        M: { x: string; y: string }[],
        commitments: string[],
    ) {
        this.timestamp = timestamp;
        this.indices = indices;
        this.R = R;
        this.M = M;
        this.commitments = commitments;
    }
}
@Schema({ versionKey: false })
export class FundingTask {
    @Prop({ required: true, unique: true, index: true })
    taskId: number;

    @Prop()
    keyIndex: number;

    @Prop()
    timestamp: number;

    @Prop({ required: true, default: 0 })
    commitmentCounter: number;

    @Prop({ type: [Encryption], required: true, default: [] })
    encryptions: Encryption[];

    @Prop({ required: true, default: [] })
    totalR: { x: string; y: string }[];

    @Prop({ required: true, default: [] })
    totalM: { x: string; y: string }[];
}

export type FundingTaskDocument = HydratedDocument<FundingTask>;
export const FundingTaskSchema = SchemaFactory.createForClass(FundingTask);
