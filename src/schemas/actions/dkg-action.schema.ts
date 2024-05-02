import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, PublicKey } from 'o1js';
import { Dkg } from '../dkg.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { DkgActionEnum } from 'src/constants';

export class DkgActionData {
    committeeId: number;
    keyId: number;
    key: string;
    actionEnum: DkgActionEnum;

    constructor(
        committeeId: number,
        keyId: number,
        key: string,
        actionEnum: DkgActionEnum,
    ) {
        this.committeeId = committeeId;
        this.keyId = keyId;
        this.key = key;
        this.actionEnum = actionEnum;
    }

    static fromAction(action: ZkApp.DKG.DkgAction): DkgActionData {
        return new DkgActionData(
            Number(action.committeeId.toBigInt()),
            Number(action.keyId.toBigInt()),
            PublicKey.fromGroup(action.key).toBase58(),
            maskToDkgActionEnum(action.mask),
        );
    }
}
@Schema({ versionKey: false })
export class DkgAction {
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

    @Prop({ type: DkgActionData })
    actionData: DkgActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type DkgActionDocument = HydratedDocument<DkgAction>;
export const DkgActionSchema = SchemaFactory.createForClass(DkgAction);

export function getDkgActionData(actions: string[]): DkgActionData {
    const action = ZkApp.DKG.DkgAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );
    return DkgActionData.fromAction(action);
}

function maskToDkgActionEnum(mask: ZkApp.DKG.DkgActionMask): DkgActionEnum {
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
