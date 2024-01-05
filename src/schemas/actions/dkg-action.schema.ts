import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { Dkg } from '../dkg.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { DkgActionEnum } from 'src/constants';

@Schema({ versionKey: false })
export class DkgAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type DkgActionDocument = HydratedDocument<DkgAction>;
export const DkgActionSchema = SchemaFactory.createForClass(DkgAction);

export function getDkg(dkgAction: DkgAction): Dkg {
    const data = dkgAction.actions;
    const action = ZkApp.DKG.Action.fromFields(
        Utilities.stringArrayToFields(dkgAction.actions),
    );
    const committeeId = Number(action.committeeId.toString());
    // console.log(action.mask);
    const maskLength = Number(Field(data[2]).toString());
    const mask = action.mask;
    const dkgActionEnum = maskToDkgActionEnum(mask);
    if (dkgActionEnum == DkgActionEnum.GENERATE_KEY) {
        const dkg: Dkg = {
            actionId: dkgAction.actionId,
            committeeId: committeeId,
            actionEnum: dkgActionEnum,
        };
        return dkg;
    }
    const dkg: Dkg = {
        actionId: dkgAction.actionId,
        committeeId: committeeId,
        keyId: Number(Field(data[1]).toString()),
        actionEnum: dkgActionEnum,
    };
    return dkg;
}

function maskToDkgActionEnum(mask: ZkApp.DKG.ActionMask): DkgActionEnum {
    if (mask.values[DkgActionEnum.GENERATE_KEY].toBoolean()) {
        return DkgActionEnum.GENERATE_KEY;
    } else if (mask.values[DkgActionEnum.FINALIZE_ROUND_1].toBoolean()) {
        return DkgActionEnum.FINALIZE_ROUND_1;
    } else if (mask.values[DkgActionEnum.FINALIZE_ROUND_2].toBoolean()) {
        return DkgActionEnum.FINALIZE_ROUND_2;
    } else if (mask.values[DkgActionEnum.DEPRECATE_KEY].toBoolean()) {
        return DkgActionEnum.DEPRECATE_KEY;
    }
}
