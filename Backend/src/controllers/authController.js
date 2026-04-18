const authModel = require('../models/authModel');
const nodemailer = require('nodemailer');

// Create Transporter using Real Credentials from .env
// You MUST provide EMAIL_USER and EMAIL_PASS in .env for this to work
const transporter = nodemailer.createTransport({
    service: 'gmail', // Standard Gmail service
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

const sendEmailOtp = async (req, res) => {
    const { email, type } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Validate credentials exist
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("Missing EMAIL_USER or EMAIL_PASS in .env");
        return res.status(500).json({ message: "Server Misconfiguration: Email credentials missing." });
    }

    try {
        const user = await authModel.getUserByEmail(email);

        if (type === 'Login' && !user) {
            return res.status(404).json({ message: "User not found. Please sign up." });
        }
        if (type === 'Signup' && user) {
            return res.status(409).json({ message: "User already exists. Please login." });
        }

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        await authModel.saveOtp(email, otp, type);

        // Send Email
        const mailOptions = {
            from: '"VornLiving Support" <no-reply@vornliving.com>',
            to: email,
            subject: 'Your VornLiving Verification Code',
            text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2>Verification Code</h2>
                    <p>Your OTP for VornLiving is:</p>
                    <h1 style="color: #4A90E2; letter-spacing: 5px;">${otp}</h1>
                    <p>This code expires in 10 minutes. Do not share it with anyone.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] OTP sent to ${email} (ID: ${info.messageId})`);
        
        res.status(200).json({ message: "OTP sent successfully to " + email });
    } catch (error) {
        console.error("Error sending email OTP:", error);
        res.status(500).json({ message: "Failed to send email. Check server logs." });
    }
};

const verifyEmailOtp = async (req, res) => {
    const { email, otp, type } = req.body;
    try {
        const otpRecord = await authModel.getLatestOtp(email, type);
        if (!otpRecord || otpRecord.OTPCode !== otp) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        await authModel.markOtpAsUsed(otpRecord.OTPID);

        if (type === 'Login') {
            const user = await authModel.getUserByEmail(email);
            return res.status(200).json({ message: "Login successful", user });
        } else {
            return res.status(200).json({ message: "OTP Verified", verified: true });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const checkUserExists = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    try {
        let user = await authModel.getUserByEmail(email);
        res.status(200).json({ exists: !!user, user });
    } catch (error) {
        console.error("Error checking user:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const registerUser = async (req, res) => {
    const { fullName, email, phoneNumber } = req.body;
    
    if (!fullName || !email) {
        return res.status(400).json({ message: "Name and Email are required" });
    }

    try {
        const existingUser = await authModel.getUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }

        const newUser = await authModel.createUser({ fullName, email, phoneNumber });
        res.status(201).json({ message: "User registered successfully", user: newUser });
    } catch (error) {
         console.error("Error registering user:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    checkUserExists,
    sendEmailOtp,
    verifyEmailOtp,
    registerUser
};
