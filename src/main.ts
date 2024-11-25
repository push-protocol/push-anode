import { EnvLoader } from './utilz/envLoader';
EnvLoader.loadEnvOrFail();

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonLoggerService } from './common/logger/winston-logger.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { StrUtil } from './utilz/strUtil';

function fixDatabaseUrl() {
  if (StrUtil.isEmpty(process.env.DATABASE_URL)) {
    let PG_USER = EnvLoader.getPropertyOrFail('PG_USER');
    let PG_PASS = EnvLoader.getPropertyOrFail('PG_PASS');
    let PG_HOST = EnvLoader.getPropertyOrFail('PG_HOST');
    let PG_PORT = EnvLoader.getPropertyOrDefault('PG_PORT', "5432");
    let DB_NAME = EnvLoader.getPropertyOrFail('DB_NAME');
    process.env.DATABASE_URL = `postgres://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${DB_NAME}`;
  }
}

async function bootstrap() {
  fixDatabaseUrl();
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

  await app.listen(EnvLoader.getPropertyAsNumber("PORT", 3000));
}
bootstrap();
