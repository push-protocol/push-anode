import dotenv from 'dotenv';
import StrUtil from './strUtil';
import { NumUtil } from './numUtil';

export class EnvLoader {
  public static loadEnvOrFail() {
    const envFound = dotenv.config();
    if (envFound.error) {
      throw new Error("⚠️  Couldn't find .env file  ⚠️");
    }
  }

  public static getPropertyOrFail(propName: string): string {
    const val = process.env[propName];

    if (StrUtil.isEmpty(val)) {
      throw new Error(`process.env.${propName} is empty`);
    }

    return val as string; // Assert that it's a string here
  }

  public static getPropertyAsBool(propName: string): boolean {
    const val = process.env[propName];
    return val != null && val.toLowerCase() === 'true';
  }

  public static getPropertyOrDefault(propName: string, def: string): string {
    const val = process.env[propName];
    return StrUtil.isEmpty(val) ? def : (val ?? def);
  }

  public static getPropertyAsNumber(
    propName: string,
    defaultValue: number,
  ): number {
    const val = process.env[propName];
    return NumUtil.parseInt(val, defaultValue);
  }
}
