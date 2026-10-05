import { DefaultExternalCallPolicy } from './default-external-call-policy';
it('bounds retries, masks vendor failures and cancels timed-out IO', async () => {
  const policy = new DefaultExternalCallPolicy();
  const failed = jest.fn(() => Promise.reject(new Error('Vendor internals')));
  await expect(
    policy.run(failed, { timeoutMs: 1000, attempts: 2, onTimeout: () => undefined }),
  ).rejects.toMatchObject({ code: 'INFRASTRUCTURE_UNAVAILABLE' });
  expect(failed).toHaveBeenCalledTimes(2);
  const cancel = jest.fn();
  await expect(
    policy.run(() => new Promise(() => undefined), {
      timeoutMs: 1,
      attempts: 1,
      onTimeout: cancel,
    }),
  ).rejects.toMatchObject({ code: 'INFRASTRUCTURE_UNAVAILABLE' });
  expect(cancel).toHaveBeenCalledTimes(1);
});
