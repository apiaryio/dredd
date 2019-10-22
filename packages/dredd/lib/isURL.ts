/**
 * Decides whether given string is a URL or not
 */
export default function isURL(location: string): boolean {
  return /^http(s)?:\/\//.test(location);
}
