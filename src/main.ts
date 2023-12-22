import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MinaModule } from './mina/mina.module';
import { CommitteesService } from './mina/committees/committees.service';
// import * as compression from 'compression';
// import helmet from 'helmet';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const config = new DocumentBuilder()
        .setTitle('Auxo server')
        .setDescription('Server for auxo project')
        .setVersion('0.0.1')
        .setBasePath('v0')
        .build();

    // app.use(
    //     compression({
    //         filter: () => {
    //             return true;
    //         },
    //         threshold: 0,
    //     }),
    // );
    // app.use(helmet());
    app.enableCors();
    app.setGlobalPrefix('v0');
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    await app.listen(3000, '0.0.0.0');
}
bootstrap();
