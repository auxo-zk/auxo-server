import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { OrganizersService } from './organizers.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { UpdateOrganizerDto } from 'src/dtos/update-organizer.dto';
import { Organizer } from 'src/schemas/organizer.schema';

@Controller('organizers')
export class OrganizersController {
    constructor(private readonly organizersService: OrganizersService) {}

    @Post()
    @ApiTags('Organizer')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async updateOrganizer(
        @Body() updateOrganizerDto: UpdateOrganizerDto,
        @Request() req: any,
    ): Promise<Organizer> {
        return await this.organizersService.updateOrganizer(
            updateOrganizerDto,
            req.user,
        );
    }

    @Get(':address')
    @ApiTags('Organizer')
    async getOrganizer(@Param('address') address: string) {
        return await this.organizersService.getOrganizer(address);
    }
}
