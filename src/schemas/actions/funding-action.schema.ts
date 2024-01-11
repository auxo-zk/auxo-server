import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { ZkApp } from '@auxo-dev/platform';
import { Utilities } from 'src/mina-contracts/utilities';
import { Funding } from '../funding.schema';

@Schema({ versionKey: false })
export class FundingAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type FundingActionDocument = HydratedDocument<FundingAction>;
export const FundingActionSchema = SchemaFactory.createForClass(FundingAction);

export function getFunding(fundingAction: FundingAction): Funding {
    const action = ZkApp.Funding.FundingAction.fromFields(
        Utilities.stringArrayToFields(fundingAction.actions),
    );
    const M: { x: string; y: string }[] = [];
    for (let i = 0; i < action.M.length.toBigInt(); i++) {
        const x = action.M.values[i].x.toString();
        const y = action.M.values[i].y.toString();
        M.push({ x: x, y: y });
    }
    const R: { x: string; y: string }[] = [];
    for (let i = 0; i < action.R.length.toBigInt(); i++) {
        const x = action.R.values[i].x.toString();
        const y = action.R.values[i].y.toString();
        R.push({ x: x, y: y });
    }
    return {
        actionId: fundingAction.actionId,
        campaignId: Number(action.campaignId.toString()),
        R: R,
        M: M,
    };
}
