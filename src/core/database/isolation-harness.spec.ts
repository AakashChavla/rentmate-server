import { verifyIsolation } from '../../test/int/isolation-harness';
describe('tenant-isolation reflection harness', () => {
  it('fails when a public method is added without coverage', async () => {
    class Repo {
      public async exposed(): Promise<void> {
        await Promise.resolve();
      }
    }
    await expect(verifyIsolation(new Repo(), {})).rejects.toThrow('exposed');
  });
});
