import { Inject, Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { FieldEncryptor } from '../../field-encryptor.contract';
import { AppConfig } from '../../../../core/config/app-config.contract';
import { AppException } from '../../../../core/errors/app-exception';
import { ErrorCode } from '../../../../core/errors/error-code.constants';
import { FILE_LIMIT as F, CRYPTO_FIELD as C } from '../../../../shared/lease.constants';
@Injectable()
export class AesFieldEncryptor extends FieldEncryptor {
  public constructor(@Inject(AppConfig) private readonly config: AppConfig) {
    super();
  }
  public override encrypt(value: string): string {
    const id = this.config.get('FIELD_KEY_ID'),
      key = this.key(id),
      iv = randomBytes(F.IV);
    const cipher = createCipheriv(C.ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(C.VERSION + ':' + id));
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [
      C.VERSION,
      id,
      iv.toString(C.ENCODING),
      cipher.getAuthTag().toString(C.ENCODING),
      data.toString(C.ENCODING),
    ].join('.');
  }
  public override decrypt(value: string): string {
    try {
      const [version, id, iv, tag, data] = value.split('.');
      if (version !== C.VERSION || !id || !iv || !tag || !data)
        throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
      const cipher = createDecipheriv(C.ALGORITHM, this.key(id), Buffer.from(iv, C.ENCODING));
      cipher.setAAD(Buffer.from(version + ':' + id));
      cipher.setAuthTag(Buffer.from(tag, C.ENCODING));
      return Buffer.concat([cipher.update(Buffer.from(data, C.ENCODING)), cipher.final()]).toString(
        'utf8',
      );
    } catch {
      throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
    }
  }
  public override hash(value: string): string {
    const key = this.config.get('FIELD_HASH_KEY');
    if (!key) throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
    return createHmac(C.HASH, Buffer.from(key, 'hex'))
      .update(C.ID_DOMAIN + value.trim().toUpperCase())
      .digest('hex');
  }
  private key(id: string): Buffer {
    const keys = this.config.get('FIELD_KEYS');
    const key = keys?.[id];
    if (!key) throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
    return Buffer.from(key, 'hex');
  }
}
