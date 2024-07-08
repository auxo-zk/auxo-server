import { Constants } from '@auxo-dev/dkg';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, Group } from 'o1js';
import {
    getFullDimensionEmptyPointVector,
    RequestStatusEnum,
} from 'src/constants';

export class Encryption {
    @Prop()
    timestamp: number;

    @Prop()
    indices: string;

    @Prop({ type: [{ x: String, y: String }] })
    R: { x: string; y: string }[];

    @Prop({ type: [{ x: String, y: String }] })
    M: { x: string; y: string }[];

    @Prop({ type: [String] })
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
        this.commitments = commitments;
        this.R = getFullDimensionEmptyPointVector();
        this.M = getFullDimensionEmptyPointVector();
        for (let i = 0; i < Constants.ENCRYPTION_LIMITS.DIMENSION; i++) {
            const dimensionIndex = Number(
                Field.fromBits(
                    Field(indices)
                        .toBits()
                        .slice(i * 8, (i + 1) * 8),
                ).toBigInt(),
            );
            const newR = Group.from(R[i].x, R[i].y).add(
                Group.from(this.R[dimensionIndex].x, this.R[dimensionIndex].y),
            );
            const newM = Group.from(M[i].x, M[i].y).add(
                Group.from(this.M[dimensionIndex].x, this.M[dimensionIndex].y),
            );
            this.R[dimensionIndex].x = newR.x.toString();
            this.R[dimensionIndex].y = newR.y.toString();
            this.M[dimensionIndex].x = newM.x.toString();
            this.M[dimensionIndex].y = newM.y.toString();
        }
    }
}
@Schema({ versionKey: false })
export class Task {
    @Prop({ required: true, unique: true, index: true })
    task: string;

    @Prop({ required: true, index: true })
    requester: string;

    @Prop({ required: true, index: true })
    taskId: number;

    @Prop()
    keyIndex: number;

    @Prop()
    timestamp: number;

    @Prop({ required: true, default: 0 })
    commitmentCounter: number;

    @Prop({ type: [Encryption], required: true, default: [] })
    encryptions: Encryption[];

    @Prop({ required: true, type: [{ x: String, y: String }], default: [] })
    totalR: { x: string; y: string }[];

    @Prop({ required: true, type: [{ x: String, y: String }], default: [] })
    totalM: { x: string; y: string }[];
}

export type TaskDocument = HydratedDocument<Task>;
export const TaskSchema = SchemaFactory.createForClass(Task);
