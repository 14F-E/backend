import MongoStore from "connect-mongo";
import cookieParser from "cookie-parser";
import cors from "cors";
import { config } from "dotenv";
import express from "express";
import session from "express-session";
import mongoose from "mongoose";
import morgan from "morgan";
import path from "path";
import favicon from "serve-favicon";
import swaggerUi, { SwaggerUiOptions } from "swagger-ui-express";

import IController from "./interfaces/controller.interface";
import errorMiddleware from "./middleware/error.middleware";
import * as swaggerDocument from "./swagger.json";

export default class App {
    public app: express.Application;

    constructor(controllers: IController[]) {
        config(); // Read and set variables from .env file (only during development).

        // create express application:
        this.app = express();

        // Serve favicon.ico:
        try {
            this.app.use(favicon(path.join(__dirname, "../favicon.ico")));
        } catch (error) {
            console.log(error.message);
        }

        this.connectToTheDatabase();
        this.initializeMiddlewares();
        this.initializeControllers(controllers);
        this.initializeErrorHandling();
    }

    public listen(): void {
        this.app.listen(process.env.PORT, () => {
            console.log(`App listening on the port ${process.env.PORT}`);
        });
    }

    // only use in tests
    public getServer(): express.Application {
        return this.app;
    }

    private initializeMiddlewares() {
        // Swagger
        const options: SwaggerUiOptions = {
            swaggerOptions: {
                docExpansion: "list",
                displayRequestDuration: true,
                defaultModelsExpandDepth: 3,
                defaultModelExpandDepth: 3,
                tryItOutEnabled: true,
                showCommonExtensions: true,
                // filter: true,
            },
        };
        this.app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));

        this.app.use(express.json()); // body-parser middleware, for read requests body
        this.app.use(cookieParser()); // cookie-parser middleware, for read requests cookies

        // Enabled CORS (Cross-Origin Resource Sharing):
        this.app.use(
            cors({
                origin: [
                    "https://minimal-dialogs.netlify.app",
                    "https://jedlik-vite-quasar-template.netlify.app",
                    "https://jedlik-vite-ts-template.netlify.app",
                    "http://localhost:8080",
                    "http://127.0.0.1:8080",
                ],
                credentials: true,
            }),
        );

        this.app.set("trust proxy", 1); // trust first proxy (If you have your node.js behind a proxy and are using secure: true, you need to set "trust proxy" in express)

        // Session management:
        // https://javascript.plainenglish.io/session-management-in-a-nodejs-express-app-with-mongodb-19f52c392dad

        // session options for deployment:
        const mySessionOptions: session.SessionOptions = {
            secret: process.env.SESSION_SECRET,
            rolling: true,
            resave: true,
            saveUninitialized: false,
            cookie: { secure: true, httpOnly: true, sameSite: "none", maxAge: 1000 * 60 * +process.env.MAX_AGE_MIN },
            unset: "destroy",
            store: MongoStore.create({
                mongoUrl: process.env.MONGO_URI,
                dbName: process.env.MONGO_DB,
                stringify: false,
            }),
        };
        // modify session options for development:
        if (["development", "test"].includes(process.env.NODE_ENV)) {
            mySessionOptions.cookie.secure = false;
            mySessionOptions.cookie.sameSite = "lax";
        }
        this.app.use(session(mySessionOptions));

        // Morgan logger:
        if (["development", "test"].includes(process.env.NODE_ENV))
            this.app.use(morgan(":method :url status=:status :date[iso] rt=:response-time ms"));
        if (process.env.NODE_ENV == "deployment") this.app.use(morgan("tiny"));
    }

    private initializeErrorHandling() {
        this.app.use(errorMiddleware);
    }

    private initializeControllers(controllers: IController[]) {
        controllers.forEach(controller => {
            this.app.use("/", controller.router);
        });
    }

    private connectToTheDatabase() {
        const { MONGO_URI, MONGO_DB } = process.env;
        // Connect to MongoDB Atlas, create database if not exist::
        mongoose.set("strictQuery", true); // for disable DeprecationWarning
        mongoose.connect(MONGO_URI, { dbName: MONGO_DB }, err => {
            if (err) {
                console.log("Unable to connect to the server. Please start MongoDB.");
            }
        });

        mongoose.connection.on("error", error => {
            console.log(`Mongoose error message: ${error.message}`);
        });
        mongoose.connection.on("connected", () => {
            console.log("Connected to MongoDB server.");
            this.listen();
        });
    }
}
