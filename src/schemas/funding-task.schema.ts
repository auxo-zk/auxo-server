import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RequestStatusEnum } from 'src/constants';

@Schema({ versionKey: false })
export class FundingTask {
    @Prop({ required: true, unique: true, index: true })
    taskId: number;

    @Prop()
    timestamp: number;

    @Prop()
    keyIndex: number;

    @Prop()
    indices: string;

    @Prop()
    R: { x: string; y: string }[];

    @Prop()
    M: { x: string; y: string }[];

    @Prop()
    commitments: string[];
}

export type FundingTaskDocument = HydratedDocument<FundingTask>;
export const FundingTaskSchema = SchemaFactory.createForClass(FundingTask);
