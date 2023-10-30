import { Injectable } from '@nestjs/common';
import { Mina } from 'o1js';

@Injectable()
export class Network {
    constructor() {
        const network = Mina.Network({
            mina: process.env.MINA,
            archive: process.env.ARCHIVE,
        });
        Mina.setActiveInstance(network);
    }
}
