import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { BoiContractWorkerModule } from './boi-contract-worker.module';

async function bootstrap() {
    await NestFactory.createApplicationContext(BoiContractWorkerModule);
}
bootstrap();
