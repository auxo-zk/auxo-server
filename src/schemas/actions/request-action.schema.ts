import { ZkApp } from '@auxo-dev/dkg';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { Utilities } from 'src/mina/utilities';
import { DkgRequest } from '../request.schema';
import { RequestActionEnum } from 'src/constants';

@Schema({ versionKey: false })
export class RequestAction {
    @Prop({ required: true, unique: true, index: true, _id: true })
    actionId: number;

    @Prop({ required: true, unique: true })
    currentActionState: string;

    @Prop({ required: true, unique: true })
    previousActionState: string;

    @Prop()
    actions: string[];
}

export type RequestActionDocument = HydratedDocument<RequestAction>;
export const RequestActionSchema = SchemaFactory.createForClass(RequestAction);

export function getDkgRequest(requestAction: RequestAction): DkgRequest {
    const action = ZkApp.Request.RequestAction.fromFields(
        Utilities.stringArrayToFields(requestAction.actions),
    );
    const requestId = action.requestId.toString();
    const requester = action.newRequester.toBase58();
    const R: { x: string; y: string }[] = [];

    for (let i = 0; i < action.R.values.length; i++) {
        const x = action.R.values[i].x.toString();
        const y = action.R.values[i].y.toString();
        R.push({ x: x, y: y });
    }
    const D: { x: string; y: string }[] = [];
    for (let i = 0; i < action.D.values.length; i++) {
        const x = action.D.values[i].x.toString();
        const y = action.D.values[i].y.toString();
        D.push({ x: x, y: y });
    }
    const dkgRequest: DkgRequest = {
        actionId: requestAction.actionId,
        requestId: requestId,
        requester: requester,
        R: R,
        D: D,
        actionEnum: maskToRequestActionEnum(action.actionType),
    };
    return dkgRequest;
}

function maskToRequestActionEnum(
    mask: ZkApp.DKG.ActionMask,
): RequestActionEnum {
    if (mask.values[RequestActionEnum.REQUEST].toBoolean()) {
        return RequestActionEnum.REQUEST;
    } else if (mask.values[RequestActionEnum.RESOLVE].toBoolean()) {
        return RequestActionEnum.RESOLVE;
    } else if (mask.values[RequestActionEnum.UNREQUEST].toBoolean()) {
        return RequestActionEnum.UNREQUEST;
    }
}
