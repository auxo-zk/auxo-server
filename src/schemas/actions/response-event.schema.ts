import { Prop, raw, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, PublicKey } from 'o1js';
import { Constants, FinalizedEvent, ZkApp } from '@auxo-dev/dkg';
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

// export function getResponseFinalizedEventData(rawData: string[]) {

// }
export class ResponseRespondedEventData {
    requestId: number;
    dimensionIndex: number;
    memberId: number;
    Di: { x: string; y: string };
}

@Schema({ versionKey: false })
export class ResponseProcessedEvent {
    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop({})
    rawData: string[];

    @Prop({ type: ResponseProcessedEventData })
    data: ResponseProcessedEventData;
}

export class ResponseFinalizedEvent {
    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop({})
    rawData: string[];

    @Prop({ type: ResponseFinalizedEventData })
    data: ResponseFinalizedEventData;
}

export class ResponseRespondedEvent {
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

export type ResponseRespondedEventDataDocument =
    HydratedDocument<ResponseRespondedEventData>;
export const ResponseRespondedEventSchema = SchemaFactory.createForClass(
    ResponseRespondedEventData,
);
