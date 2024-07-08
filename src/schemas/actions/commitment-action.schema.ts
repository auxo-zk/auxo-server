import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Storage, ZkApp } from '@auxo-dev/platform';
import { Utilities } from 'src/mina-contracts/utilities';
import { Field, Provable, PublicKey } from 'o1js';
import { ProjectActionEnum } from 'src/constants';

export class NullifierActionData {
    nullifier: string;

    static fromAction(
        action: ZkApp.Nullifier.NullifierAction,
    ): NullifierActionData {
        return {
            nullifier: action.nullifier.toString(),
        };
    }
}
@Schema({ versionKey: false })
export class NullifierAction {
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

    @Prop()
    actionData: NullifierActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type NullifierActionDocument = HydratedDocument<NullifierAction>;
export const NullifierActionSchema =
    SchemaFactory.createForClass(NullifierAction);

export function getNullifierActionData(actions: string[]): NullifierActionData {
    const action = ZkApp.Nullifier.NullifierAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );

    return NullifierActionData.fromAction(action);
}
