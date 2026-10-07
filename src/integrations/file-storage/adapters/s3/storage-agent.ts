import { Agent } from 'node:https';
import { lookup } from 'node:dns';
import { isIP, type LookupFunction } from 'node:net';
import { AppException } from '../../../../core/errors/app-exception';
import { ErrorCode } from '../../../../core/errors/error-code.constants';
const ADDRESS_FAMILY = { IPV4: 4, IPV6: 6 } as const;
const PRIVATE_IPV4 =
  /^(0\.|10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.(0\.|168\.)|198\.(1[89]\.|51\.100\.)|203\.0\.113\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|(22[4-9]|23\d|24\d|25[0-5])\.)/;
export function publicStorageAddress(address: string): boolean {
  if (isIP(address) === ADDRESS_FAMILY.IPV4) return !PRIVATE_IPV4.test(address);
  return (
    isIP(address) === ADDRESS_FAMILY.IPV6 && /^[23]/.test(address) && !/^2001:db8:/i.test(address)
  );
}
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true }, (error, addresses) => {
    if (error) {
      callback(error, '');
      return;
    }
    const first = addresses[0];
    if (!first || addresses.some((row) => !publicStorageAddress(row.address))) {
      callback(new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE), '');
      return;
    }
    if (options.all) callback(null, addresses);
    else callback(null, first.address, first.family);
  });
};
export function storageAgent(): Agent {
  return new Agent({ lookup: guardedLookup, keepAlive: true });
}
export function storageEndpoint(endpoint: string | undefined): string | undefined {
  if (!endpoint) return undefined;
  if (!endpoint.startsWith('https://'))
    throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
  const url = new URL(endpoint),
    host = url.hostname.replace(/^\[|\]$/g, '');
  if (url.username || url.password || (isIP(host) && !publicStorageAddress(host)))
    throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
  return endpoint;
}
