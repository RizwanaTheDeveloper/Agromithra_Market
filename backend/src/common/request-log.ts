import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

interface Req { method: string; originalUrl?: string; url: string; ip?: string; }
interface Res { statusCode: number; }

/** One line per request: method, path without the query string (it may hold tokens), status and time. Bodies are never logged. */
@Injectable()
export class RequestLog implements NestInterceptor {
  private readonly log = new Logger('http');
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp(), req = http.getRequest<Req>(), res = http.getResponse<Res>(), start = Date.now();
    const path = (req.originalUrl ?? req.url).split('?')[0];
    return next.handle().pipe(tap({
      next: () => this.log.log(`${req.method} ${path} ${res.statusCode} ${Date.now() - start}ms`),
      error: (e: { status?: number }) => this.log.warn(`${req.method} ${path} ${e.status ?? 500} ${Date.now() - start}ms`),
    }));
  }
}
