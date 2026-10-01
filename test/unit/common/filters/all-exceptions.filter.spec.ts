import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '../../../../src/common/constants/error-codes';
import { AllExceptionsFilter } from '../../../../src/common/filters/all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  function createHost(requestId = 'req-abc') {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ id: requestId, url: '/api/v1/items', method: 'GET' }),
      }),
    } as unknown as ArgumentsHost;

    return { host, status, json };
  }

  const filter = new AllExceptionsFilter();

  it('returns a validation error envelope', () => {
    const { host, status, json } = createHost();

    filter.catch(
      new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: [{ field: 'name', messages: ['name should not be empty'] }],
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: [{ field: 'name', messages: ['name should not be empty'] }],
      },
      meta: { requestId: 'req-abc' },
    });
  });

  it('maps known HTTP exceptions to machine-readable codes', () => {
    const { host, status, json } = createHost('req-404');

    filter.catch(new NotFoundException('Item not found'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ErrorCode.NOT_FOUND,
        message: 'Item not found',
        details: null,
      },
      meta: { requestId: 'req-404' },
    });
  });

  it('hides unexpected errors behind an internal error code', () => {
    const { host, status, json } = createHost();

    filter.catch(new Error('database password leaked'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Internal server error',
        details: null,
      },
      meta: { requestId: 'req-abc' },
    });
  });
});
