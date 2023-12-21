import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticateDto } from 'src/dtos/authenticate.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post()
    @ApiTags('Auth')
    async authenticate(@Body() authenticateDto: AuthenticateDto) {
        return this.authService.verifySignature(
            authenticateDto.address,
            authenticateDto.role,
            authenticateDto.signature,
        );
    }
}
