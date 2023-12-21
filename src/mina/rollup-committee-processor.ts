import { NestFactory } from '@nestjs/core';
import { Job, DoneCallback } from 'bull';
import { AppModule } from 'src/app.module';
import { MinaModule } from './mina.module';
import { CommitteesService } from './committee/committee.service';
import { Logger } from '@nestjs/common';

export default async function (job: Job, cb: DoneCallback) {
    const logger = new Logger('RollupCommitteeProcessor');
    logger.debug(`[${process.pid}] ${JSON.stringify(job.data)}`);
    // cb(null, 'It works');
    const app = await NestFactory.createApplicationContext(AppModule);
    const committeeService = app.select(MinaModule).get(CommitteesService);
    committeeService.compile().then(() => {
        // committeeService.rollup().then(() => {
        app.close().then(() => {
            logger.debug('Rollup Committee successfully');
        });
        // });
    });
}
