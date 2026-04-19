"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const modules_1 = require("./modules");
const bootstrap = () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.get("/", (req, res, next) => {
        return res.status(200).json({ message: "welcome to social app" });
    });
    app.use("/auth", modules_1.authRouter);
    app.get("/*dummy", (req, res, next) => {
        return res.status(404).json({ message: "invalid routing" });
    });
    app.listen(3000, () => {
        console.log(`server is runnint on port 3000`);
    });
};
exports.default = bootstrap;
