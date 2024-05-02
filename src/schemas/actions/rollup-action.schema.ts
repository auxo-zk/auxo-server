import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { Round1 } from '../round-1.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';

export class RollupActionData {
    zkAppIndex: number;
    actionHash: string;

    constructor(zkAppIndex: number, actionHash: string) {
        this.zkAppIndex = zkAppIndex;
        this.actionHash = actionHash;
    }

    static fromAction(action: ZkApp.Rollup.RollupAction): RollupActionData {
        return new RollupActionData(
            Number(action.zkAppIndex.toBigInt()),
            action.actionHash.toString(),
        );
    }
}
@Schema({ versionKey: false })
export class RollupAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ index: true })
    actionHash: string;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop({ type: RollupActionData })
    actionData: RollupActionData;

    @Prop()
    actions: string[];

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type RollupActionDocument = HydratedDocument<RollupAction>;
export const RollupActionSchema = SchemaFactory.createForClass(RollupAction);

export function getRollupActionData(actions: string[]): RollupActionData {
    const action = ZkApp.Rollup.RollupAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );
    return RollupActionData.fromAction(action);
}
