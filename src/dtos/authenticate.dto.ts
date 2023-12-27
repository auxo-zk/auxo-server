import { ServerSignature } from 'src/entities/server-signature.entity';

export class AuthenticateDto {
    address: string;
    role: number;
    signature: { field: string; scalar: string };
    serverSignature: ServerSignature;
}
