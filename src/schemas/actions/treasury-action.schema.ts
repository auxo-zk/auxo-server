import { ZkApp } from '@auxo-dev/platform';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, Provable } from 'o1js';
import { Utilities } from 'src/mina-contracts/utilities';
import { Treasury } from '../treasury.schema';

@Schema({ versionKey: false })
export class TreasuryAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type TreasuryActionDocument = HydratedDocument<TreasuryAction>;
export const TreasuryActionSchema =
    SchemaFactory.createForClass(TreasuryAction);

export function getTreasury(treasuryAction: TreasuryAction): Treasury {
    const action = ZkApp.Treasury.TreasuryAction.fromFields(
        Utilities.stringArrayToFields(treasuryAction.actions),
    );
    return {
        actionId: treasuryAction.actionId,
        campaignId: Number(action.campaignId.toString()),
        projectId: Number(action.projectId.toString()),
    };
}
