import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import fs from "fs";

import authRoutes from "./modules/auth/auth.routes";
import productRoutes from "./modules/products/product.routes";
import warehouseRoutes from "./modules/warehouses/warehouse.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import inboundRoutes from "./modules/inbounds/inbound.routes";
import outboundRoutes from "./modules/outbounds/outbound.routes";
import approvalRoutes from "./modules/approvals/approval.routes";
import userRoutes from "./modules/users/user.routes";
import ocrRoutes from "./modules/ocr/ocr.routes";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

const openApiPath = path.join(process.cwd(), "openapi.yaml");
const swaggerDocument = YAML.load(openApiPath);
const serverStartedAt = new Date().toISOString();

function readBuildTime() {
  const buildTimePath = path.join(process.cwd(), "build-time.txt");

  try {
    return fs.readFileSync(buildTimePath, "utf8").trim() || serverStartedAt;
  } catch {
    return serverStartedAt;
  }
}

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/version", (_req, res) => {
  res.status(200).json({
    version: process.env.APP_VERSION || "ocr-rule-library-20260501-local",
    buildTime: readBuildTime(),
    serverStartedAt,
  });
});

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/warehouses", warehouseRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/inbounds", inboundRoutes);
app.use("/outbounds", outboundRoutes);
app.use("/approvals", approvalRoutes);
app.use("/users", userRoutes);
app.use("/ocr", ocrRoutes);

// 一定要放在所有路由后面
app.use(errorMiddleware);

export default app;
