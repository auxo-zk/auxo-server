import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { Dkg } from '../dkg.schema';

export const enum DkgEventEnum {
    KEY_UPDATES_REDUCED,
    __LENGTH,
}

export const enum DkgActionEnum {
    GENERATE_KEY,
    FINALIZE_ROUND_1,
    FINALIZE_ROUND_2,
    DEPRECATE_KEY,
    __LENGTH,
}

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
    const committeeId = Number(Field.from(data[0]).toString());
    const maskLength = Number(Field.from(data[2]).toString());
    const mask: number[] = [];
    for (let i = 0; i < maskLength; i++) {
        mask.push(Number(Field.from(data[3 + i]).toString()));
    }
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
        keyId: Number(Field.from(data[1]).toString()),
        actionEnum: dkgActionEnum,
    };
    return dkg;
}

function maskToDkgActionEnum(mask: number[]) {
    if (mask[DkgActionEnum.GENERATE_KEY] == 1) {
        return DkgActionEnum.GENERATE_KEY;
    } else if (mask[DkgActionEnum.FINALIZE_ROUND_1] == 1) {
        return DkgActionEnum.GENERATE_KEY;
    } else if (mask[DkgActionEnum.FINALIZE_ROUND_2] == 1) {
        return DkgActionEnum.GENERATE_KEY;
    } else if (mask[DkgActionEnum.DEPRECATE_KEY] == 1) {
        return DkgActionEnum.GENERATE_KEY;
    }
}
