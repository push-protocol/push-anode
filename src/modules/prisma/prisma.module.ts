import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Global() // Makes the PrismaModule globally available
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
