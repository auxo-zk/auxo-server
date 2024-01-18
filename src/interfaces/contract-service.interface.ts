import { OnModuleInit } from '@nestjs/common';

export interface ContractServiceInterface extends OnModuleInit {
    // For fetching actions, events to update the database
    fetch(): any;

    // For updating merkle trees
    updateMerkleTrees(): any;

    // For calling fetch and update merkle trees
    update(): any;
}
