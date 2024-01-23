import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';

import { Job, DoneCallback } from 'bull';
import { MinaContractsModule } from './mina-contracts/mina-contracts.module';
import { CommitteeContractService } from './mina-contracts/committee-contract/committee-contract.service';

export default async function (job: Job, cb: DoneCallback) {
    console.log(`[${process.pid}] ${JSON.stringify(job.data)}`);
    const app = await NestFactory.createApplicationContext(AppModule, {});
    const committeeContractService = app
        .select(MinaContractsModule)
        .get(CommitteeContractService, { strict: true });
    committeeContractService.compile().then(async () => {
        console.log('done');
        await app.close();
    });

    cb(null, 'It works');
}
