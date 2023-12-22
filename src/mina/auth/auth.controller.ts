import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticateDto } from 'src/dtos/authenticate.dto';
import { AuthService } from './auth.service';
import { Encoding, Field, PrivateKey, Provable, Signature } from 'o1js';
import { IPFSHash } from '@auxo-dev/auxo-libs';
import { ServerSignature } from 'src/entities/server-signature.entity';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post()
    @ApiTags('Auth')
    async authenticate(@Body() authenticateDto: AuthenticateDto) {
        // return this.authService.verifySignature(
        //     authenticateDto.address,
        //     authenticateDto.role,
        //     authenticateDto.signature,
        // );
    }

    @Get()
    @ApiTags('Auth')
    async getAuth(): Promise<ServerSignature> {
        return await this.authService.createNonce();
    }
}
