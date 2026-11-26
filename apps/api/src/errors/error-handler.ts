import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from 'fastify-type-provider-zod';
import { AppError } from './app-error.js';
import type { ErrorDetails } from './types.js';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    requestId: string;
    details?: ErrorDetails;
  };
}

function buildErrorPayload(params: {
  request: FastifyRequest;
  statusCode: number;
  code: string;
  message: string;
  details?: ErrorDetails | undefined;
}): ApiErrorResponse {
  return {
    error: {
      code: params.code,
      message: params.message,
      statusCode: params.statusCode,
      requestId: params.request.id,
      ...(params.details !== undefined ? { details: params.details } : {}),
    },
  };
}

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Erreurs métier explicites (NotFoundError, BadRequestError, ConflictError, etc.)
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      request.log.error({ err: error, code: error.code }, error.message);
    } else {
      request.log.warn({ code: error.code, details: error.details }, error.message);
    }

    return reply.status(error.statusCode).send(
      buildErrorPayload({
        request,
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
        details: isProduction && error.statusCode >= 500 ? undefined : error.details,
      }),
    );
  }

  // 2. Erreurs de validation sur query / params / body / headers via fastify-type-provider-zod
  if (hasZodFastifySchemaValidationErrors(error)) {
    const validationIssues = error.validation.map((issue) => ({
      path: issue.instancePath === '/' ? '' : issue.instancePath.slice(1).replaceAll('/', '.'),
      message: issue.message ?? 'Donnée invalide',
    }));

    request.log.warn({ validationIssues }, 'Erreur de validation de requête');

    return reply.status(400).send(
      buildErrorPayload({
        request,
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Les paramètres de la requête sont invalides',
        details: validationIssues,
      }),
    );
  }

  // 3. Erreur de sérialisation de réponse (si la sortie d'un handler ne respecte pas le schéma Zod)
  if (isResponseSerializationError(error)) {
    request.log.error(
      {
        err: error,
        cause: error.cause,
      },
      'Erreur de sérialisation de la réponse',
    );

    return reply.status(500).send(
      buildErrorPayload({
        request,
        statusCode: 500,
        code: 'RESPONSE_SERIALIZATION_ERROR',
        message: 'Une erreur interne est survenue lors de la préparation de la réponse',
        details: isProduction
          ? undefined
          : {
              issues: error.cause?.issues,
            },
      }),
    );
  }

  // 4. Autres erreurs Fastify (ex. JSON mal formé -> statusCode 400/415)
  const fastifyErr = error as FastifyError;
  if (typeof fastifyErr.statusCode === 'number' && fastifyErr.statusCode < 500) {
    request.log.warn({ err: fastifyErr }, fastifyErr.message);

    return reply.status(fastifyErr.statusCode).send(
      buildErrorPayload({
        request,
        statusCode: fastifyErr.statusCode,
        code: fastifyErr.code ?? 'BAD_REQUEST',
        message: fastifyErr.message,
      }),
    );
  }

  // 5. Erreur technique non gérée (500)
  request.log.error({ err: error }, 'Erreur serveur non gérée');

  return reply.status(500).send(
    buildErrorPayload({
      request,
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Une erreur interne est survenue',
      details: isProduction
        ? undefined
        : {
            name: error.name,
            message: error.message,
          },
    }),
  );
}
