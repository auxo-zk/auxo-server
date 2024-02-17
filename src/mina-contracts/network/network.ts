import { Injectable, OnModuleInit } from '@nestjs/common';
import { Mina, fetchLastBlock, fetchTransactionStatus } from 'o1js';
import { BerkeleyNetwork, Lightnet } from 'src/constants';

@Injectable()
export class Network implements OnModuleInit {
    constructor() {
        Mina.setActiveInstance(BerkeleyNetwork);
    }

    async onModuleInit() {
        // await fetchLastBlock();
    }
}
