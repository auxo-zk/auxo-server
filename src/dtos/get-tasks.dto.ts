import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class GetTasksDto {
    @IsString()
    requester: string;

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => {
        switch (value) {
            case 'true':
                return true;
            case 'false':
                return false;
            default:
                return undefined;
        }
    })
    hasRequest?: boolean;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    keyIndex?: number;
}
