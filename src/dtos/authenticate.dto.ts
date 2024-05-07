import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsEnum,
    IsNumberString,
    IsString,
    ValidateNested,
} from 'class-validator';
import { AuthRoleEnum } from 'src/constants';

class ServerSignature {
    @IsArray()
    @IsNumberString({}, { each: true })
    msg: string[];

    @IsString()
    signature: string;
}

export class AuthenticateDto {
    @IsString()
    address: string;

    @IsEnum(AuthRoleEnum)
    @ApiProperty({
        enum: AuthRoleEnum,
    })
    role: number;

    signature: { r: string; s: string };

    @ValidateNested()
    @Type(() => ServerSignature)
    serverSignature: ServerSignature;
}
