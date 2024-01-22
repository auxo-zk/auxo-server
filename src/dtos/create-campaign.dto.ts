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

class Time {
    @IsDate()
    @Type(() => Date)
    from: Date;

    @IsDate()
    @Type(() => Date)
    to: Date;
}

class Timeline {
    @ValidateNested()
    @Type(() => Time)
    participation: Time;

    @ValidateNested()
    @Type(() => Time)
    investment: Time;

    @ValidateNested()
    @Type(() => Time)
    allocation: Time;
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
