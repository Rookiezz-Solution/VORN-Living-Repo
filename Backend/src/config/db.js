const sql = require("mssql");
require("dotenv").config();

const parseServerAndInstance = () => {
    const rawServer = String(process.env.DB_SERVER || "localhost").trim();
    const hasSlash = rawServer.includes("\\");
    const split = hasSlash ? rawServer.split("\\") : [rawServer];
    const server = split[0] || "localhost";
    const instanceFromServer = split[1] || "";
    const instanceName = String(process.env.DB_INSTANCE || instanceFromServer || "").trim() || undefined;
    return { server, instanceName };
};

const { server, instanceName } = parseServerAndInstance();
const parsedEnvPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined;
const forcePort = String(process.env.DB_FORCE_PORT || '').toLowerCase() === 'true';
const port = forcePort
    ? parsedEnvPort
    : (instanceName ? undefined : (Number.isFinite(parsedEnvPort) ? parsedEnvPort : 1433));

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server,
    database: process.env.DB_DATABASE,
    ...(Number.isFinite(port) ? { port } : {}),
    connectionTimeout: parseInt(process.env.DB_CONN_TIMEOUT || "60000", 10),
    requestTimeout: parseInt(process.env.DB_REQ_TIMEOUT || "60000", 10),
    pool: {
        max: parseInt(process.env.DB_POOL_MAX || "20", 10),
        min: parseInt(process.env.DB_POOL_MIN || "2", 10),
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE || "600000", 10),
        acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE || "60000", 10),
        createTimeoutMillis: parseInt(process.env.DB_POOL_CREATE || "60000", 10),
        destroyTimeoutMillis: parseInt(process.env.DB_POOL_DESTROY || "30000", 10)
    },
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        ...(instanceName ? { instanceName } : {})
    }
};

let pool;

const connectDB = async () => {
    try {
        if (pool && pool.connected) return pool;
        pool = new sql.ConnectionPool(dbConfig);
        pool.on("error", (err) => {
            console.error("SQL pool error:", err);
        });
        await pool.connect();
        console.log("MSSQL connected");
        return pool;
    } catch (error) {
        console.error("DB connection failed:", error);
        // Do not exit process, allow server to keep running
        // process.exit(1); 
        throw error;
    }
};

const getPool = () => {
    if (!pool || !pool.connected) {
        // Auto-reconnect attempt or informative error
        // throw new Error("Database not connected");
        return pool; // Or handle better
    }
    return pool;
};

const getRequest = (timeoutMs) => {
    // Check pool existence
    if (!pool || !pool.connected) {
         throw new Error("Database connection lost. Please check server logs.");
    }
    const req = pool.request();
    const envTimeout = process.env.DB_REQ_TIMEOUT ? parseInt(process.env.DB_REQ_TIMEOUT, 10) : undefined;
    const effective = timeoutMs ?? envTimeout;
    if (effective && Number.isFinite(effective)) {
        req.timeout = effective;
    }
    return req;
};

module.exports = { sql, connectDB, getPool, getRequest };
