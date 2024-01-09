import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { BuildersService } from './builders.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { UpdateBuilderDto } from 'src/dtos/update-builder-profile.dto';
import { Builder } from 'src/schemas/builder.schema';
import { Project } from 'src/schemas/project.schema';

@Controller('builders')
export class BuildersController {
    constructor(private readonly buildersService: BuildersService) {}

    @Get(':address')
    @ApiTags('Builder')
    async getBuilder(@Param('address') address: string): Promise<Builder> {
        return await this.buildersService.getBuilder(address);
    }

    @Post()
    @ApiTags('Builder')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async updateBuilder(
        @Body() updateBuilderDto: UpdateBuilderDto,
        @Request() req: any,
    ): Promise<Builder> {
        return await this.buildersService.updateBuilder(
            updateBuilderDto,
            req.user,
        );
    }

    @Get(':address/projects')
    @ApiTags('Builder')
    async getProjects(@Param('address') address: string): Promise<Project[]> {
        return await this.buildersService.getProjects(address);
    }
}
