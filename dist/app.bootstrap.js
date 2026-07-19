"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const modules_1 = require("./modules");
const middleware_1 = require("./middleware");
const config_1 = require("./config/config");
const connection_db_1 = __importDefault(require("./DB/connection.db"));
const redis_service_1 = require("./common/service/redis.service");
const cors_1 = __importDefault(require("cors"));
const s3_service_1 = require("./common/service/s3.service");
const node_stream_1 = require("node:stream");
const node_util_1 = require("node:util");
const success_response_1 = require("./common/response/success.response");
const express_2 = require("graphql-http/lib/use/express");
const schema_gql_1 = require("./modules/graphql/schema.gql");
const index_1 = require("./modules/chat/index");
const s3WriteStream = (0, node_util_1.promisify)(node_stream_1.pipeline);
const bootstrap = async () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json(), (0, cors_1.default)());
    app.all("/graphql", middleware_1.authentication, (0, express_2.createHandler)({
        schema: schema_gql_1.schema,
        context: (req) => ({ user: req.raw.user, decoded: req.raw.decoded }),
    }));
    app.get("/", (req, res, next) => {
        return res.status(200).json({ message: "welcome to social app" });
    });
    app.use("/auth", modules_1.authRouter);
    app.use("/user", modules_1.userRouter);
    app.use("/post", modules_1.postRouter);
    app.use("/chat", index_1.chatRouter);
    app.get("/uploads/*path", async (req, res, next) => {
        const { download, fileName } = req.query;
        const { path } = req.params;
        const Key = path.join("/");
        const { Body, ContentType } = await s3_service_1.s3Service.getAsset({ Key });
        res.setHeader("Content-Type", ContentType || "application/octet-stream");
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
        if (download === "true") {
            res.setHeader("Content-Disposition", `attachment; filename="${fileName || Key.split("/").pop()}"`);
        }
        return await s3WriteStream(Body, res);
    });
    app.get("/pre-signed/*path", async (req, res, next) => {
        const { download, fileName } = req.query;
        const { path } = req.params;
        const Key = path.join("/");
        const url = await s3_service_1.s3Service.createPreSignedFetchLink({
            Key,
            download,
            fileName,
        });
        return (0, success_response_1.successResponse)({ res, data: { url } });
    });
    app.get("/*dummy", (req, res, next) => {
        return res.status(404).json({ message: "invalid routing" });
    });
    app.use(middleware_1.globalErrorHandler);
    await (0, connection_db_1.default)();
    await redis_service_1.redisService.connect();
    const httpServer = app.listen(config_1.PORT, () => {
        console.log(`server is running on port ${config_1.PORT}`);
    });
    modules_1.realTimeGateway.initializeIo(httpServer);
};
exports.default = bootstrap;
