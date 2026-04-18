const authenticateUser = (req, res, next) => {
    // In a real app, verify JWT token here
    // For now, we trust the X-User-ID header sent by the client
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized: User ID missing" });
    }

    req.user = { UserID: userId };
    next();
};

module.exports = authenticateUser;