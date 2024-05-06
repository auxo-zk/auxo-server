import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, PublicKey } from 'o1js';
import { Constants, ProcessedContributions, ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { DkgActionEnum, EventEnum } from 'src/constants';

@Schema({ versionKey: false })
export class Round1Event {
    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop()
    enum: number;

    @Prop({})
    data: string[];

    getData(): ProcessedContributions {
        if (this.enum == EventEnum.PROCESSED) {
            const processedContributions = ProcessedContributions.fromFields(
                Utilities.stringArrayToFields(this.data),
            );

            return processedContributions;
        }
        return null;
    }
}

export type Round1EventDocument = HydratedDocument<Round1Event>;
export const Round1EventSchema = SchemaFactory.createForClass(Round1Event);
