import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Field, PublicKey } from 'o1js';
import { Constants, ProcessedActions, ZkApp } from '@auxo-dev/dkg';
import { Utilities } from 'src/mina-contracts/utilities';
import { DkgActionEnum, EventEnum } from 'src/constants';

@Schema({ versionKey: false })
export class DkgEvent {
    @Prop({ required: true, unique: true, index: true, _id: true })
    eventId: number;

    @Prop()
    enum: number;

    @Prop({})
    data: string[];

    getData(): ProcessedActions {
        if (this.enum == EventEnum.PROCESSED) {
            return ProcessedActions.fromFields(
                Utilities.stringArrayToFields(this.data),
            );
        }
        return null;
    }
}

export type DkgEventDocument = HydratedDocument<DkgEvent>;
export const DkgEventSchema = SchemaFactory.createForClass(DkgEvent);
