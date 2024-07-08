import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { FileInformation } from 'src/entities/file-information.entity';

@Schema({ versionKey: false })
export class Organizer {
    @Prop({ unique: true, index: true })
    address: string;

    @Prop()
    name: string;

    @Prop()
    website: string;

    @Prop()
    description: string;

    @Prop()
    img: string;
}

export type OrganizerDocument = HydratedDocument<Organizer>;
export const OrganizerSchema = SchemaFactory.createForClass(Organizer);
