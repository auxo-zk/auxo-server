import { IsArray, IsNumber, IsNumberString, IsString } from 'class-validator';

export class ServerSignature {
    @IsArray()
    @IsNumberString({}, { each: true })
    msg: string[];

    @IsString()
    signature: string;
}
