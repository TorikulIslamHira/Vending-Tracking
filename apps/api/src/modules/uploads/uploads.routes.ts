import { FastifyInstance } from "fastify";
import { tenantHandler } from "../../core/middlewares/tenantHandler";
import { uploadIssuePhotoHandler } from "./uploads.controller";

export async function uploadsRoutes(app: FastifyInstance): Promise<void> {
  // Any authenticated tenant user can upload — field agents report issues
  // and resolve them from the field, this isn't an admin-only action.
  app.addHook("onRequest", tenantHandler);

  app.post("/issue-photo", uploadIssuePhotoHandler);
}

export default uploadsRoutes;
