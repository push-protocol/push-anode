export class NumUtil {
  public static parseInt(
    value: string | undefined,
    defaultValue: number,
  ): number {
    if (value == null) {
      return defaultValue;
    }
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
}
