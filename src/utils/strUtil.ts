export default class StrUtil {
  public static isEmpty(s: string | undefined): boolean {
    return s == null || (typeof s === 'string' && s.length === 0);
  }

  public static isHex(s: string): boolean {
    if (StrUtil.isEmpty(s)) {
      return false;
    }
    const pattern = /^[A-F0-9]+$/i;
    return pattern.test(s);
  }

  public static getOrDefault(
    s: string | undefined,
    defaultValue: string,
  ): string {
    return StrUtil.isEmpty(s) ? defaultValue : (s ?? defaultValue);
  }

  public static toStringDeep(obj: any): string {
    return JSON.stringify(obj, null, 4);
  }

  public static normalizeEthAddress(addr: string): string {
    return addr;
  }
}
