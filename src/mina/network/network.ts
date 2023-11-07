import { Injectable, OnModuleInit } from '@nestjs/common';
import { Mina, fetchLastBlock } from 'o1js';

@Injectable()
export class Network implements OnModuleInit {
    constructor() {
        const network = Mina.Network({
            mina: process.env.MINA,
            archive: process.env.ARCHIVE,
        });
        Mina.setActiveInstance(network);
    }

    async onModuleInit() {
        await fetchLastBlock();
    }
}
