import { NestFactory } from '@nestjs/core';
import { Job, DoneCallback } from 'bull';
import { AppModule } from 'src/app.module';
import { MinaContractsModule } from './mina.module';
import { CommitteeContractService } from './committee-contract/committee-contract.service';
import { Logger } from '@nestjs/common';

export default async function (job: Job, cb: DoneCallback) {
    const logger = new Logger('RollupCommitteeProcessor');
    logger.debug(`[${process.pid}] ${JSON.stringify(job.data)}`);
    // cb(null, 'It works');
    const app = await NestFactory.createApplicationContext(AppModule);
    const committeesService = app
        .select(MinaContractsModule)
        .get(CommitteeContractService);
    committeesService.compile().then(() => {
        // committeesService.rollup().then(() => {
        app.close().then(() => {
            logger.debug('Rollup Committee successfully');
        });
        // });
    });
}
