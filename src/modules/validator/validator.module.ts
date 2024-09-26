import { Module } from '@nestjs/common';
import { ValidatorContractState } from './validator-contract-state.service';

@Module({
  providers: [ValidatorContractState],
  exports: [ValidatorContractState],
})
export class ValidatorModule {}
