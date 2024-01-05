import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ versionKey: false })
export class Project {
    @Prop({ required: true, unique: true, index: true })
    committeeId: number;

    @Prop()
    members: string[];

    @Prop()
    ipfsHash: string;

    @Prop()
    payeeAccount: string;

    @Prop({ required: true, default: false, index: true })
    active?: boolean;
}
