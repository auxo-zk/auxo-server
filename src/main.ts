import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
// import * as compression from 'compression';
// import helmet from 'helmet';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const config = new DocumentBuilder()
        .setTitle('Auxo server')
        .setDescription('Server for auxo project')
        .setVersion('0.0.1')
        .addBearerAuth(
            {
                // I was also testing it without prefix 'Bearer ' before the JWT
                description: `[just text field] Please enter token in following format: Bearer <JWT>`,
                name: 'Authorization',
                bearerFormat: 'Bearer', // I`ve tested not to use this field, but the result was the same
                scheme: 'Bearer',
                type: 'http', // I`ve attempted type: 'apiKey' too
                in: 'Header',
            },
            'access-token', // This name here is important for matching up with @ApiBearerAuth() in your controller!
        )
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
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    await app.listen(3000, '127.0.0.1');
}
bootstrap();
