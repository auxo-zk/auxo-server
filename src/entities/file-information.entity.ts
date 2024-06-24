import { IsNumber, IsString } from 'class-validator';

export class FileInformation {
    @IsString()
    fileName: string;

    @IsNumber()
    fileSize: number;

    @IsString()
    URL: string;
}
