import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { Storage, ZkApp } from '@auxo-dev/platform';
import { Utilities } from 'src/mina-contracts/utilities';
import { Funding } from '../funding.schema';

export class FundingActionData {
    actionType: Storage.FundingStorage.FundingActionEnum;
    fundingId: number;
    campaignId: number;
    investor: string;
    amount: number;

    static fromAction(action: ZkApp.Funding.FundingAction): FundingActionData {
        return {
            actionType: Number(action.actionType.toBigInt()),
            fundingId: Number(action.fundingId.toBigInt()),
            campaignId: Number(action.campaignId.toBigInt()),
            investor: action.investor.toBase58(),
            amount: Number(action.amount.toBigInt()),
        };
    }
}

@Schema({ versionKey: false })
export class FundingAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop([String])
    actions: string[];

    @Prop({ type: FundingActionData })
    actionData: FundingActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type FundingActionDocument = HydratedDocument<FundingAction>;
export const FundingActionSchema = SchemaFactory.createForClass(FundingAction);

export function getFundingActionData(actions: string[]): FundingActionData {
    const action = ZkApp.Funding.FundingAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );

    return FundingActionData.fromAction(action);
}
