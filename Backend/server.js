require("dotenv").config();
const app = require("./src/index");
const { connectDB } = require("./src/config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    // Attempt DB connection but don't block server startup
    connectDB().catch(err => console.error("Initial DB connection failed (will retry on request):", err));

    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
};

startServer();