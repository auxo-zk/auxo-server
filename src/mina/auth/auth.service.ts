import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(private readonly jwtService: JwtService) {}

    async verifySignature(
        address: string,
        role: number,
        signature: string,
    ): Promise<any> {
        const payload = { sub: address, role: role };
        const accessToken = await this.jwtService.signAsync(payload);
        return { accessToken: accessToken };
    }
}
