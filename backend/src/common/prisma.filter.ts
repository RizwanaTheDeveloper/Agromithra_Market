import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const status = error.code === 'P2025' ? 404 : error.code === 'P2002' ? 409 : error.code === 'P2003' ? 400 : 500;
    const message = status === 404 ? 'Record not found' : status === 409 ? 'Record already exists' : status === 400 ? 'Invalid related record' : 'Database operation failed';
    host.switchToHttp().getResponse<{ status: (code: number) => { json: (value: unknown) => void } }>().status(status).json({ statusCode: status, message });
  }
}
