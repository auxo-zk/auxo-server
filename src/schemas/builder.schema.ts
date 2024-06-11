import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNumber, IsString } from 'class-validator';
import { HydratedDocument } from 'mongoose';
import { FileInformation } from 'src/entities/file-information.entity';

@Schema({ versionKey: false })
export class Builder {
    @Prop({ unique: true, index: true })
    address: string;

    @Prop()
    name: string;

    @Prop()
    role: string;

    @Prop()
    link: string;

    @Prop()
    description: string;

    @Prop({ type: FileInformation })
    img: FileInformation;
}

export type BuilderDocument = HydratedDocument<Builder>;
export const BuilderSchema = SchemaFactory.createForClass(Builder);
