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
  let PORT = EnvLoader.getPropertyAsNumber("PORT", 3000);
  await app.listen(PORT);

  let artwork =
    `    
 ____            _          _             _     _            _ 
|  _ \\ _   _ ___| |__      / \\   _ __ ___| |__ (_)_   ____ _| |
| |_) | | | / __| '_ \\    / _ \\ | '__/ __| '_ \\| \\ \\ / / _\` | |
|  __/| |_| \\__ \\ | | |  / ___ \\| | | (__| | | | |\\ V / (_| | |
|_|  _ \\__,_|___/_| |_| /_/   \\_\\_|  \\___|_| |_|_| \\_/ \\__,_|_|
| \\ | | ___   __| | ___                                        
|  \\| |/ _ \\ / _\` |/ _ \\                                       
| |\\  | (_) | (_| |  __/                                       
|_| \\_|\\___/ \\__,_|\\___|                                                                                      
`;

  console.log(`
      ################################################
      ${artwork}
      🛡️  Server listening on port: ${PORT} 🛡️
      ################################################
    `);


}
bootstrap();
