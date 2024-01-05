import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsString, ValidateNested } from 'class-validator';
import { AuthRoleEnum } from 'src/constants';
import { ServerSignature } from 'src/entities/server-signature.entity';

export class AuthenticateDto {
    @IsString()
    address: string;

    @IsEnum(AuthRoleEnum)
    @ApiProperty({ description: 'BUILDER | ORGANIZER | INVESTOR' })
    role: number;

    signature: { r: string; s: string };

    @ValidateNested()
    @Type(() => ServerSignature)
    serverSignature: ServerSignature;
}
