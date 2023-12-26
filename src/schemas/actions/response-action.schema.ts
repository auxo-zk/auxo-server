import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { DkgResponse } from '../response.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina/utilities';

@Schema({ versionKey: false })
export class ResponseAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type ResponseActionDocument = HydratedDocument<ResponseAction>;
export const ResponseActionSchema =
    SchemaFactory.createForClass(ResponseAction);

export function getDkgResponse(responseAction: ResponseAction): DkgResponse {
    const action = ZkApp.Response.Action.fromFields(
        Utilities.stringArrayToFields(responseAction.actions),
    );
    const contribution: { x: string; y: string }[] = [];
    for (let i = 0; i < action.contribution.D.length.toBigInt(); i++) {
        const x = action.contribution.D.values[i].x.toString();
        const y = action.contribution.D.values[i].y.toString();
        contribution.push({ x: x, y: y });
    }
    const result: DkgResponse = {
        actionId: responseAction.actionId,
        committeeId: Number(action.committeeId.toString()),
        keyId: Number(action.keyId.toString()),
        memberId: Number(action.memberId.toString()),
        requestId: action.requestId.toString(),
        contribution: contribution,
    };
    return result;
}
