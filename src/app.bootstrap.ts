import express from "express";
import { authRouter, postRouter, userRouter } from "./modules";
import { authentication, globalErrorHandler } from "./middleware";
import { PORT } from "./config/config";
import connectDB from "./DB/connection.db";
import { redisService } from "./common/service/redis.service";
import cors from "cors";
import { s3Service } from "./common/service/s3.service";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { successResponse } from "./common/response/success.response";
import { createHandler } from "graphql-http/lib/use/express";
import { schema } from './modules/graphql/schema.gql';

const s3WriteStream = promisify(pipeline);

const bootstrap = async (): Promise<void> => {
  const app: express.Express = express();

  app.use(express.json(), cors());


    app.all("/graphql", authentication, createHandler({schema: schema, context: (req)=>({user: req.raw.user, decoded: req.raw.decoded})}))



  app.get(
    "/",
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ): express.Response => {
      return res.status(200).json({ message: "welcome to social app" });
    },
  );

  //application-routing
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/post", postRouter);
  app.get(
    "/uploads/*path",
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const { download, fileName } = req.query as {
        download: string;
        fileName: string;
      };
      const { path } = req.params as { path: string[] };
      const Key = path.join("/");
      const { Body, ContentType } = await s3Service.getAsset({ Key });
      console.log({ Body, ContentType });

      res.setHeader("Content-Type", ContentType || "application/octet-stream");
      res.set("Cross-Origin-Resource-Policy", "cross-origin");

      if (download === "true") {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${fileName || Key.split("/").pop()}"`,
        ); // only apply it for  download
      }
      return await s3WriteStream(Body as NodeJS.ReadableStream, res);
    },
  );
  app.get(
    "/pre-signed/*path",
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      const { download, fileName } = req.query as {
        download: string;
        fileName: string;
      };
      const { path } = req.params as { path: string[] };
      const Key = path.join("/");
      const url = await s3Service.createPreSignedFetchLink({
        Key,
        download,
        fileName,
      });

      return successResponse({ res, data: { url } });
    },
  );

  app.get(
    "/*dummy",
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ): express.Response => {
      return res.status(404).json({ message: "invalid routing" });
    },
  );

  //application-error
  app.use(globalErrorHandler);

  await connectDB();
  await redisService.connect();

  app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
  });
};

export default bootstrap;
