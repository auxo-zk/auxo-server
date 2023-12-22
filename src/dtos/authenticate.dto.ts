import { ServerSignature } from 'src/entities/server-signature.entity';

export class AuthenticateDto {
    address: string;
    role: number;
    signature: string;
    serverSignature: ServerSignature;
}
