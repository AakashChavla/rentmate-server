import { Injectable } from '@nestjs/common';
import { AntivirusScanner } from '../../file-storage.contract';
@Injectable()
export class NoneAntivirusScanner extends AntivirusScanner {
  public override scan(_path: string): Promise<void> {
    return Promise.resolve();
  }
}
