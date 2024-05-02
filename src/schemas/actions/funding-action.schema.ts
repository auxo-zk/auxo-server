import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, PublicKey, UInt64 } from 'o1js';
import { Storage, ZkApp } from '@auxo-dev/platform';
import { Utilities } from 'src/mina-contracts/utilities';
import { Funding } from '../funding.schema';

export class FundingActionData {
    actionType: Storage.FundingStorage.FundingActionEnum;
    fundingId: number;
    campaignId: number;
    investor: string;
    amount: number;
    constructor(
        actionType: Storage.FundingStorage.FundingActionEnum,
        fundingId: number,
        campaignId: number,
        investor: string,
        amount: number,
    ) {
        this.actionType = actionType;
        this.fundingId = fundingId;
        this.campaignId = campaignId;
        this.investor = investor;
        this.amount = amount;
    }

    static fromAction(action: ZkApp.Funding.FundingAction): FundingActionData {
        return new FundingActionData(
            Number(action.actionType.toBigInt()),
            Number(action.fundingId.toBigInt()),
            Number(action.campaignId.toBigInt()),
            action.investor.toBase58(),
            Number(action.amount.toBigInt()),
        );
    }

    toFundingInformation(): Storage.FundingStorage.FundingInformation {
        return new Storage.FundingStorage.FundingInformation({
            campaignId: Field(this.campaignId),
            investor: PublicKey.fromBase58(this.investor),
            amount: new UInt64(
                this.actionType == Storage.FundingStorage.FundingActionEnum.FUND
                    ? this.amount
                    : 0,
            ),
        });
    }
}

@Schema({ versionKey: false })
export class FundingAction {
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
