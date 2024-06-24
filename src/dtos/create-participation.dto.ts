import { Type } from 'class-transformer';
import {
    IsArray,
    IsDate,
    IsString,
    IsUrl,
    ValidateNested,
} from 'class-validator';
import { FileInformation } from 'src/entities/file-information.entity';

class ScopeOfWork {
    @IsArray()
    @IsString({ each: true })
    information: string[];

    @IsString()
    milestone: string;

    @IsString()
    raisingAmount: string;

    @IsDate()
    @Type(() => Date)
    deadline?: Date;
}

export class CreateParticipationDto {
    @IsArray()
    @IsString({ each: true })
    answers: string[];

    @IsArray()
    @Type(() => ScopeOfWork)
    @ValidateNested({ each: true })
    scopeOfWorks: ScopeOfWork[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FileInformation)
    documents: FileInformation[];
}
