import { Constants, ZkApp } from '@auxo-dev/dkg';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { Utilities } from 'src/mina-contracts/utilities';
import { RequestActionEnum } from 'src/constants';

export class RequesterActionData {
    @Prop()
    taskId: number;

    @Prop()
    timestamp: number;

    keyIndex: number;

    @Prop()
    indices: string;

    @Prop({ type: [{ x: String, y: String }] })
    R: { x: string; y: string }[];

    @Prop({ type: [{ x: String, y: String }] })
    M: { x: string; y: string }[];

    @Prop()
    commitments: string[];

    constructor(
        taskId: number,
        timestamp: number,
        keyIndex: number,
        indices: string,
        R: { x: string; y: string }[],
        M: { x: string; y: string }[],
        commitments: string[],
    ) {
        this.taskId = taskId;
        this.timestamp = timestamp;
        this.keyIndex = keyIndex;
        this.indices = indices;
        this.R = R;
        this.M = M;
        this.commitments = commitments;
    }

    static fromAction(
        action: ZkApp.Requester.RequesterAction,
    ): RequesterActionData {
        const R: { x: string; y: string }[] = [];
        const M: { x: string; y: string }[] = [];
        const commitments: string[] = [];
        for (let i = 0; i < Constants.ENCRYPTION_LIMITS.DIMENSION; i++) {
            R.push({
                x: action.R.values[i].x.toString(),
                y: action.R.values[i].y.toString(),
            });
            M.push({
                x: action.M.values[i].x.toString(),
                y: action.M.values[i].y.toString(),
            });
            commitments.push(action.commitments.values[i].toString());
        }

        return new RequesterActionData(
            Number(action.taskId.toBigint()),
            Number(action.timestamp.toBigInt()),
            Number(action.keyIndex.toBigInt()),
            action.indices.toString(),
            R,
            M,
            commitments,
        );
    }
}
@Schema({ versionKey: false })
export class FundingRequesterAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ index: true })
    actionHash: string;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];

    @Prop({ type: RequesterActionData })
    actionData: RequesterActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type FundingRequesterActionDocument =
    HydratedDocument<FundingRequesterAction>;
export const FundingRequesterActionSchema = SchemaFactory.createForClass(
    FundingRequesterAction,
);

export function getRequesterActionData(actions: string[]): RequesterActionData {
    const action = ZkApp.Requester.RequesterAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );

    return RequesterActionData.fromAction(action);
}
