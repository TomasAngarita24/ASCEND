import type { NextFunction, Request, Response } from 'express';

type AsyncRequestHandler = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler(handler: AsyncRequestHandler) {
  return (request: Request, response: Response, next: NextFunction): void => {
    void handler(request, response, next).catch(next);
  };
}
