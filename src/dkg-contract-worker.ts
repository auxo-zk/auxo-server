import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DkgContractWorkerModule } from './dkg-contract-worker.module';

async function bootstrap() {
    await NestFactory.createApplicationContext(DkgContractWorkerModule);
}
bootstrap();
