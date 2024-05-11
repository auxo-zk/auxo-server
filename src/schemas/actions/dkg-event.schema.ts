import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, PublicKey } from 'o1js';
import { Constants, ProcessedActions, ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { DkgActionEnum, EventEnum } from 'src/constants';

export function getDkgEventData(rawData: string[]): string[] {
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
export class DkgEvent {
    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop({})
    rawData: string[];

    @Prop({})
    data: string[];
}

export type DkgEventDocument = HydratedDocument<DkgEvent>;
export const DkgEventSchema = SchemaFactory.createForClass(DkgEvent);
