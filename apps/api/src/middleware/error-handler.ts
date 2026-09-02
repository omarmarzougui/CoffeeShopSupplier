import type { FastifyInstance } from "fastify";
import { appErrorHandler } from "../lib/errors.js";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, _req, reply) => {
    const { statusCode, body } = appErrorHandler(error);
    if (statusCode >= 500) {
      app.log.error(error);
    }
    reply.code(statusCode).send(body);
  });
}
