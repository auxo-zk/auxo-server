import { Storage, ZkApp } from '@auxo-dev/platform';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, Provable } from 'o1js';
import { Utilities } from 'src/mina-contracts/utilities';
import { Treasury } from '../treasury.schema';

export class TreasuryManagerActionData {
    actionType: Storage.TreasuryManagerStorage.TreasuryManagerActionEnum;
    campaignId: number;
    projectIndex: number;
    amount: number;

    static fromAction(
        action: ZkApp.TreasuryManager.TreasuryManagerAction,
    ): TreasuryManagerActionData {
        return {
            actionType: Number(action.actionType.toBigInt()),
            campaignId: Number(action.campaignId.toBigInt()),
            projectIndex: Number(action.projectIndex.toBigInt()),
            amount: Number(action.amount.toBigInt()),
        };
    }
}

@Schema({ versionKey: false })
export class TreasuryManagerAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ index: true })
    actionHash: string;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop([String])
    actions: string[];

    @Prop({ type: TreasuryManagerActionData })
    actionData: TreasuryManagerActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type TreasuryManagerActionDocument =
    HydratedDocument<TreasuryManagerAction>;
export const TreasuryManagerActionSchema = SchemaFactory.createForClass(
    TreasuryManagerAction,
);

export function getTreasuryManagerActionData(
    actions: string[],
): TreasuryManagerActionData {
    const action = ZkApp.TreasuryManager.TreasuryManagerAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );
    return TreasuryManagerActionData.fromAction(action);
}
