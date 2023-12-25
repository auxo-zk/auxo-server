import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ versionKey: false })
export class Committee {
    @Prop({ required: true, unique: true, index: true })
    committeeId: number;

    @Prop()
    numberOfMembers: number;

    @Prop()
    threshold: number;

    @Prop()
    publicKeys: string[];

    @Prop()
    ipfsHash: string;

    @Prop()
    name?: string;

    @Prop()
    creator?: string;

    @Prop()
    members?: Member[];

    @Prop({ required: true, default: false, index: true })
    active?: boolean;
}

export type CommitteeDocument = HydratedDocument<Committee>;
export const CommitteeSchema = SchemaFactory.createForClass(Committee);

export class Member {
    memberId: number;
    alias: string;
    publicKey: string;
}
