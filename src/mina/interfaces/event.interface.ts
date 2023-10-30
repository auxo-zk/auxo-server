import { UInt32 } from 'o1js';

export interface Event {
    events: {
        data: string[];
        transactionInfo: {
            hash: string;
            memo: string;
            status: string;
        };
    }[];
    blockHeight: UInt32;
    blockHash: string;
    parentBlockHash: string;
    globalSlot: UInt32;
    chainStatus: string;
}
