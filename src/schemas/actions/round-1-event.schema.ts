import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, PublicKey } from 'o1js';
import { Constants, ProcessedActions, ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { DkgActionEnum, EventEnum } from 'src/constants';

export function getRound1EventData(rawData: string[]): string[] {
    const processedActions = ProcessedActions.fromFields(
        Utilities.stringArrayToFields(rawData),
    );
    const data: string[] = [];
    for (let i = 0; i < processedActions.length.toBigInt(); i++) {
        data.push(processedActions.values[i].toString());
    }
    return data;
}
@Schema({ versionKey: false })
export class Round1Event {
    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop({})
    rawData: string[];

    @Prop({})
    data: string[];
}

export type Round1EventDocument = HydratedDocument<Round1Event>;
export const Round1EventSchema = SchemaFactory.createForClass(Round1Event);
