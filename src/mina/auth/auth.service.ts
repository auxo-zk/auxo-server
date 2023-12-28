import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import {
    Encoding,
    Field,
    PrivateKey,
    PublicKey,
    Scalar,
    Signature,
} from 'o1js';
import { ServerSignature } from 'src/entities/server-signature.entity';
import { Utilities } from '../utilities';
import { AuthenticateDto } from 'src/dtos/authenticate.dto';
import { authTimeLimit } from 'src/constants';

@Injectable()
export class AuthService {
    constructor(private readonly jwtService: JwtService) {}

    async verifySignature(authenticateDto: AuthenticateDto): Promise<string> {
        try {
            const msgRawFields = Utilities.stringArrayToFields(
                authenticateDto.serverSignature.msg,
            );
            const msgRawString = Encoding.stringFromFields(msgRawFields);
            const msgRaw = JSON.parse(msgRawString);
            const time = Date.parse(msgRaw['time']);
            const now = new Date().getTime();
            if (now - time >= 0 && now - time <= authTimeLimit) {
                const privateKey = PrivateKey.fromBase58(
                    process.env.FEE_PAYER_PRIVATE_KEY,
                );
                const serverSignature = Signature.fromBase58(
                    authenticateDto.serverSignature.signature,
                );
                const requesterPublicKey = PublicKey.fromBase58(
                    authenticateDto.address,
                );
                const requesterSignature = Signature.fromJSON(
                    authenticateDto.signature,
                );
                if (
                    serverSignature.verify(
                        privateKey.toPublicKey(),
                        msgRawFields,
                    ) &&
                    requesterSignature.verify(requesterPublicKey, msgRawFields)
                ) {
                    const payload = {
                        sub: authenticateDto.address,
                        role: authenticateDto.role,
                    };
                    const accessToken =
                        await this.jwtService.signAsync(payload);
                    return accessToken;
                } else {
                    throw new UnauthorizedException();
                }
            } else {
                throw new UnauthorizedException();
            }
        } catch (err) {
            throw new BadRequestException();
        }
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
            signature: signature.toBase58(),
        };
        return serverSignature;
    }
}
