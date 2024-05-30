import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, Provable, PublicKey } from 'o1js';
import {
    Constants,
    FinalizedDArrayEvent,
    FinalizedEvent,
    RespondedDArrayEvent,
    ResultArrayEvent,
    ZkApp,
} from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { DkgActionEnum } from 'src/constants';

export class RequestEventData {
    requestId: number;
    dimensionIndex: number;
    result: string;

    constructor(requestId: number, dimensionIndex: number, result: string) {
        this.requestId = requestId;
        this.dimensionIndex = dimensionIndex;
        this.result = result;
    }
}

export function getRequestEventData(rawData: string[]) {
    const data = ResultArrayEvent.fromFields(
        Utilities.stringArrayToFields(rawData),
    );
    return new RequestEventData(
        Number(data.requestId.toBigInt()),
        data.dimensionIndex.toNumber(),
        data.result.toScalar().toBigInt().toString(10),
    );
}

@Schema({ versionKey: false })
export class RequestEvent {
    @Prop({ required: true, index: true })
    batchId: number;

    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop({})
    rawData: string[];

    @Prop({ type: RequestEventData })
    data: RequestEventData;
}

export type RRequestEventDocument = HydratedDocument<RequestEvent>;
export const RequestEventSchema = SchemaFactory.createForClass(RequestEvent);
