import * as Sentry from '@sentry/react-native';

/**
 * Centralized logging service
 * - Development: logs to console
 * - Production: only errors sent to Sentry
 */

const isDevelopment = __DEV__;

class Logger {
  /**
   * Log informational messages (dev only)
   */
  info(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log debug messages (dev only)
   */
  debug(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  }

  /**
   * Log warnings (dev only, but tracked in production)
   */
  warn(message: string, data?: any) {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
    } else {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: data,
      });
    }
  }

  /**
   * Log errors (always logged and sent to Sentry)
   */
  error(message: string, error?: Error | any, context?: any) {
    console.error(`[ERROR] ${message}`, error);

    // Send to Sentry in all environments
    if (error instanceof Error) {
      Sentry.captureException(error, {
        contexts: {
          error_context: context,
        },
        extra: {
          message,
        },
      });
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: {
          error,
          context,
        },
      });
    }
  }

  /**
   * Log network requests (dev only)
   */
  network(method: string, url: string, status?: number, data?: any) {
    if (isDevelopment) {
      console.log(
        `[NETWORK] ${method} ${url}${status ? ` - ${status}` : ''}`,
        data !== undefined ? data : ''
      );
    }
  }

  /**
   * Log user actions for analytics (dev only for debugging)
   */
  userAction(action: string, data?: any) {
    if (isDevelopment) {
      console.log(`[USER_ACTION] ${action}`, data !== undefined ? data : '');
    }
    // TODO: Send to analytics service (Firebase Analytics, Mixpanel, etc.)
  }

  /**
   * Log performance metrics
   */
  performance(metric: string, duration: number, data?: any) {
    if (isDevelopment) {
      console.log(
        `[PERFORMANCE] ${metric}: ${duration}ms`,
        data !== undefined ? data : ''
      );
    }
    // TODO: Send to performance monitoring service
  }
}

export const logger = new Logger();
