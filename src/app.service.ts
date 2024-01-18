import { Injectable } from '@nestjs/common';
import { Cache } from 'o1js';
import { ServerConfig } from './entities/server-config.entity';

@Injectable()
export class AppService {
    getServerConfig(): ServerConfig {
        const serverConfig: ServerConfig = {
            publicKey: process.env.FEE_PAYER_PUBLIC_KEY,
            contracts: {
                committee: process.env.COMMITTEE_ADDRESS,
                dkg: process.env.DKG_ADDRESS,
                round1: process.env.ROUND_1_ADDRESS,
                round2: process.env.ROUND_2_ADDRESS,
                request: process.env.REQUEST_ADDRESS,
                response: process.env.RESPONSE_ADDRESS,
            },
        };
        return serverConfig;
    }
}
