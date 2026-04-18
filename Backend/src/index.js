const express = require("express");
const cors = require("cors");
const errorMiddleware = require("./middleware/middleware");
const path = require("path");

const app = express();
const { connectDB } = require("./config/db");

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Disable caching for all API routes to ensure 200 OK responses
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// Static files for uploads (evidence images, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health Check Routes
app.get("/", (req, res) => {
    res.send("Backend Server is Running Successfully!");
});

app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "API is healthy", timestamp: new Date() });
});

// DB Guard: ensure pool is connected before handling API routes
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("DB Guard connection failed:", err);
        return res.status(503).json({ message: "Service temporarily unavailable. Please retry shortly." });
    }
});

const apiRoutes = require("./routes/apiRoutes");
const paymentRoutes = require("./routes/payment");

// Routes

app.use("/api", apiRoutes);
app.use("/api", paymentRoutes);


app.use(errorMiddleware);

module.exports = app;
