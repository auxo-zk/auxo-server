import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
    const work = await NestFactory.createApplicationContext(WorkerModule);
}
bootstrap();
