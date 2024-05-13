import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, Provable, PublicKey } from 'o1js';
import {
    Constants,
    FinalizedDArrayEvent,
    FinalizedEvent,
    RespondedDArrayEvent,
    ZkApp,
} from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { DkgActionEnum } from 'src/constants';

export class ResponseProcessedEventData {
    requestId: number;
    actions: string[];
    constructor(requestId: number, actions: string[]) {
        this.requestId = requestId;
        this.actions = actions;
    }
}

export function getResponseProcessedEventData(
    rawData: string[],
): ResponseProcessedEventData {
    const data = FinalizedEvent.fromFields(
        Utilities.stringArrayToFields(rawData),
    );
    const actions: string[] = [];
    for (let i = 0; i < data.actions.length.toBigInt(); i++) {
        actions.push(data.actions.values[i].toString());
    }
    return new ResponseProcessedEventData(
        Number(data.requestId.toBigInt()),
        actions,
    );
}
export class ResponseFinalizedEventData {
    requestId: number;
    dimensionIndex: number;
    Di: { x: string; y: string };

    constructor(
        requestId: number,
        dimensionIndex: number,
        Di: { x: string; y: string },
    ) {
        this.requestId = requestId;
        this.dimensionIndex = dimensionIndex;
        this.Di = Di;
    }
}

export function getResponseFinalizedEventData(
    rawData: string[],
): ResponseFinalizedEventData {
    const data = FinalizedDArrayEvent.fromFields(
        Utilities.stringArrayToFields(rawData),
    );
    return new ResponseFinalizedEventData(
        Number(data.requestId.toBigInt()),
        Number(data.dimensionIndex.toBigInt()),
        { x: data.Di.x.toString(), y: data.Di.y.toString() },
    );
}
export class ResponseRespondedEventData {
    requestId: number;
    memberId: number;
    dimensionIndex: number;
    Di: { x: string; y: string };

    constructor(
        requestId: number,
        memberId: number,
        dimensionIndex: number,

        Di: { x: string; y: string },
    ) {
        this.requestId = requestId;
        this.memberId = memberId;
        this.dimensionIndex = dimensionIndex;
        this.Di = Di;
    }
}

export function getResponseRespondedEventData(
    rawData: string[],
): ResponseFinalizedEventData {
    const data = RespondedDArrayEvent.fromFields(
        Utilities.stringArrayToFields(rawData),
    );
    return new ResponseRespondedEventData(
        Number(data.requestId.toBigInt()),
        Number(data.memberId.toBigInt()),
        Number(data.dimensionIndex.toBigInt()),
        { x: data.Di.x.toString(), y: data.Di.y.toString() },
    );
}

@Schema({ versionKey: false })
export class ResponseProcessedEvent {
    @Prop({ required: true, index: true })
    batchId: number;

    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop({})
    rawData: string[];

    @Prop({ type: ResponseProcessedEventData })
    data: ResponseProcessedEventData;

    @Prop({ required: true, default: false })
    processed?: boolean;
}

@Schema({ versionKey: false })
export class ResponseFinalizedEvent {
    @Prop({ required: true, index: true })
    batchId: number;

    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop({})
    rawData: string[];

    @Prop({ type: ResponseFinalizedEventData })
    data: ResponseFinalizedEventData;
}

@Schema({ versionKey: false })
export class ResponseRespondedEvent {
    @Prop({ required: true, index: true })
    batchId: number;

    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop({})
    rawData: string[];

    @Prop({ type: ResponseRespondedEventData })
    data: ResponseRespondedEventData;
}

export type ResponseProcessedEventDocument =
    HydratedDocument<ResponseProcessedEvent>;
export const ResponseProcessedEventSchema = SchemaFactory.createForClass(
    ResponseProcessedEvent,
);

export type ResponseFinalizedEventDocument =
    HydratedDocument<ResponseFinalizedEvent>;
export const ResponseFinalizedEventSchema = SchemaFactory.createForClass(
    ResponseFinalizedEvent,
);

export type ResponseRespondedEventDocument =
    HydratedDocument<ResponseRespondedEvent>;
export const ResponseRespondedEventSchema = SchemaFactory.createForClass(
    ResponseRespondedEvent,
);
