import { Injectable } from '@nestjs/common';
import { ExternalCallPolicy, type ExternalCallOptions } from './external-call-policy.contract';
import { AppException } from '../errors/app-exception';
import { ErrorCode } from '../errors/error-code.constants';
@Injectable()
export class DefaultExternalCallPolicy extends ExternalCallPolicy {
  public override async run<T>(action: () => Promise<T>, options: ExternalCallOptions): Promise<T> {
    for (let attempt = 0; attempt < options.attempts; attempt++) {
      try {
        return await this.invoke(action, options);
      } catch {
        if (attempt + 1 === options.attempts)
          throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
      }
    }
    throw new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE);
  }
  private async invoke<T>(action: () => Promise<T>, options: ExternalCallOptions): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        action(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            options.onTimeout();
            reject(new AppException(ErrorCode.INFRASTRUCTURE_UNAVAILABLE));
          }, options.timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
