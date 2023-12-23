import {
    Body,
    Controller,
    Get,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticateDto } from 'src/dtos/authenticate.dto';
import { AuthService } from './auth.service';
import { Encoding, Field, PrivateKey, Provable, Signature } from 'o1js';
import { IPFSHash } from '@auxo-dev/auxo-libs';
import { ServerSignature } from 'src/entities/server-signature.entity';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post()
    @ApiTags('Auth')
    async authenticate(
        @Body() authenticateDto: AuthenticateDto,
    ): Promise<string> {
        return await this.authService.verifySignature(authenticateDto);
    }

    @Get()
    @ApiTags('Auth')
    async requestAuth(): Promise<ServerSignature> {
        return await this.authService.createNonce();
    }

    @Get('profile')
    @ApiTags('Auth')
    @ApiBearerAuth('access-token')
    @UseGuards(AuthGuard)
    async getProfile(@Request() req) {
        return req.user;
    }
}
