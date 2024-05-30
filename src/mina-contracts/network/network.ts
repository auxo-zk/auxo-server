import { Injectable, OnModuleInit } from '@nestjs/common';
import { Mina, fetchLastBlock, fetchTransactionStatus } from 'o1js';
@Injectable()
export class Network implements OnModuleInit {
    constructor() {
        const BerkeleyNetwork = Mina.Network({
            mina: process.env.BERKELEY_MINA,
            archive: process.env.BERKELEY_ARCHIVE,
        });
        const Lightnet = Mina.Network({
            mina: process.env.LIGHTNET_MINA,
            archive: process.env.LIGHTNET_ARCHIVE,
        });
        const MinaScanNetwork = Mina.Network({
            mina: process.env.MINA_SCAN_MINA,
            archive: process.env.MINA_SCAN_ARCHIVE,
        });

        Mina.setActiveInstance(
            Mina.Network({
                mina: process.env.LIGHTNET_MINA,
                archive: process.env.LIGHTNET_ARCHIVE,
            }),
        );
    }

    async onModuleInit() {
        // await fetchLastBlock();
    }
}
