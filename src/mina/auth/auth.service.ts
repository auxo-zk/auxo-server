import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { Encoding, PrivateKey, Signature } from 'o1js';
import { ServerSignature } from 'src/entities/server-signature.entity';
import { Utilities } from '../utilities';

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

    async createNonce(): Promise<ServerSignature> {
        const msgRaw = {
            nonce: randomBytes(32).toString('hex'),
            time: new Date().toISOString(),
        };
        const msg = Encoding.stringToFields(JSON.stringify(msgRaw));
        const privateKey = PrivateKey.fromBase58(
            process.env.FEE_PAYER_PRIVATE_KEY,
        );
        const signature = Signature.create(privateKey, msg);
        const serverSignature: ServerSignature = {
            msg: Utilities.fieldsToStringArray(msg),
            signature: {
                r: signature.r.toString(),
                s: signature.s.toBigInt().toString(),
            },
        };
        return serverSignature;
    }
}
