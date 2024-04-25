import { ZkApp } from '@auxo-dev/dkg';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field } from 'o1js';
import { Utilities } from 'src/mina-contracts/utilities';
import { RawDkgRequest } from '../raw-request.schema';
import { RequestActionEnum } from 'src/constants';

export class RequestActionData {
    requestId: number;
    keyIndex: number;
    taskId: number;
    expirationTimestamp: number;
    accumulationRoot: string;
    resultRoot: string;

    constructor(
        requestId: number,
        keyIndex: number,
        taskId: number,
        expirationTimestamp: number,
        accumulationRoot: string,
        resultRoot: string,
    ) {
        this.requestId = requestId;
        this.keyIndex = keyIndex;
        this.taskId = taskId;
        this.expirationTimestamp = expirationTimestamp;
        this.accumulationRoot = accumulationRoot;
        this.resultRoot = resultRoot;
    }

    static fromAction(action: ZkApp.Request.RequestAction): RequestActionData {
        return new RequestActionData(
            Number(action.requestId.toBigInt()),
            Number(action.keyIndex.toBigInt()),
            Number(action.taskId.toBigInt()),
            Number(action.expirationTimestamp.toBigInt()),
            action.accumulationRoot.toString(),
            action.resultRoot.toString(),
        );
    }
}
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

    @Prop({ type: RequestActionData })
    actionData: RequestActionData;

    @Prop({ required: true, default: false })
    active?: boolean;
}

export type RequestActionDocument = HydratedDocument<RequestAction>;
export const RequestActionSchema = SchemaFactory.createForClass(RequestAction);

export function getRequestActionData(actions: string[]): RequestActionData {
    const action = ZkApp.Request.RequestAction.fromFields(
        Utilities.stringArrayToFields(actions),
    );
    return RequestActionData.fromAction(action);
}
