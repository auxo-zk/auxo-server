import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsNumber,
    IsString,
    IsUrl,
    ValidateNested,
} from 'class-validator';

class Timeline {
    @IsDate()
    @Type(() => Date)
    startParticipation: Date;

    @IsDate()
    @Type(() => Date)
    startFunding: Date;

    @IsDate()
    @Type(() => Date)
    startRequesting: Date;
}

class PrivacyOption {
    @IsBoolean()
    isPrivate: boolean;

    @IsNumber()
    committeeId: number;

    @IsNumber()
    keyId: number;
}

class Question {
    @IsString()
    question: string;

    @IsString()
    hint: string;

    @IsBoolean()
    isRequired: boolean;
}

export class CreateCampaignDto {
    @IsString()
    name: string;

    @IsUrl()
    coverImage: string;

    @IsUrl()
    avatarImage: string;

    @IsString()
    description: string;

    @Type(() => Timeline)
    @ValidateNested()
    timeline: Timeline;

    @Type(() => PrivacyOption)
    @ValidateNested()
    privacyOption: PrivacyOption;

    @IsNumber()
    capacity: number;

    @IsNumber()
    fundingOption: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Question)
    questions: Question[];
}
