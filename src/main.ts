import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './common/logger/winston-logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EnvLoader } from './utilz/envLoader';

EnvLoader.loadEnvOrFail();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLoggerService(),
  });

  app.enableCors({
    origin: '*', // Specify the client origin or use '*' for wide open access
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
  });

  const config = new DocumentBuilder()
    .setTitle('Push-Anode API')
    .setDescription('API documentation for Push-Anode project')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
