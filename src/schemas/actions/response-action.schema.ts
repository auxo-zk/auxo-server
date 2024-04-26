import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { DkgResponse } from '../response.schema';
import { ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';

export class ResponseActionData {
    committeeId: number;
    keyId: number;
    memberId: number;
    requestId: number;
    dimension: number;
    responseRootD: string;

    constructor(
        committeeId: number,
        keyId: number,
        memberId: number,
        requestId: number,
        dimension: number,
        responseRootD: string,
    ) {
        this.committeeId = committeeId;
        this.keyId = keyId;
        this.memberId = memberId;
        this.requestId = requestId;
        this.dimension = dimension;
        this.responseRootD = responseRootD;
    }

    static fromAction(
        action: ZkApp.Response.ResponseAction,
    ): ResponseActionData {
        return new ResponseActionData(
            Number(action.committeeId.toBigInt()),
            Number(action.keyId.toBigInt()),
            Number(action.memberId.toBigInt()),
            Number(action.requestId.toBigInt()),
            Number(action.dimension.toBigInt()),
            action.responseRootD.toString(),
        );
    }
}
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

    @Prop({ type: ResponseActionData })
    actionData: ResponseActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type ResponseActionDocument = HydratedDocument<ResponseAction>;
export const ResponseActionSchema =
    SchemaFactory.createForClass(ResponseAction);

export function getResponseActionData(actions: string[]): ResponseActionData {
    const action = ZkApp.Response.ResponseAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );
    return ResponseActionData.fromAction(action);
}
