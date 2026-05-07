const authModel = require('../models/authModel');
const orderModel = require('../models/orderModel');
const nodemailer = require('nodemailer');

// Create Transporter using Real Credentials from .env
// You MUST provide EMAIL_USER and EMAIL_PASS in .env for this to work
const tlsRejectUnauthorized = String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false';
const transporter = nodemailer.createTransport({
    service: 'gmail', // Standard Gmail service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    ...(tlsRejectUnauthorized ? {} : { tls: { rejectUnauthorized: false } })
});

const sendEmailOtp = async (req, res) => {
    const { email, type } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Validate credentials exist (allow dev fallback)
    const hasEmailCreds = !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS;
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    if (!hasEmailCreds && isProd) {
        console.error("Missing EMAIL_USER or EMAIL_PASS in .env");
        return res.status(500).json({ message: "Server Misconfiguration: Email credentials missing." });
    }

    try {
        const otpType = String(type || 'checkout');
        const lowerType = otpType.toLowerCase();
        const isCheckout = lowerType === 'checkout';

        if (!isCheckout) {
            const user = await authModel.getUserByEmail(email);

            if (otpType === 'Login' && !user) {
                return res.status(404).json({ message: "User not found. Please sign up." });
            }
            if (otpType === 'Signup' && user) {
                return res.status(409).json({ message: "User already exists. Please login." });
            }
        }

        const ttlMinutes = isCheckout ? 5 : 10;
        const ttlSeconds = ttlMinutes * 60;

        // Strictly use 4-digit OTP for all cases
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const expiresAtMs = Date.now() + ttlSeconds * 1000;
        emailOtpStore.set(`${lowerType}:${String(email).trim().toLowerCase()}`, { otp, expiresAtMs });
        try {
            await authModel.saveOtp(email, otp, otpType, ttlMinutes);
        } catch (dbErr) {
            console.error("Email OTP DB save failed (falling back to in-memory store):", dbErr);
        }

        if (hasEmailCreds) {
            const mailOptions = {
                from: `"VornLiving Support" <${process.env.EMAIL_USER || 'no-reply@vornliving.com'}>`,
                to: email,
                subject: 'Your VornLiving Verification Code',
                text: `Your OTP is: ${otp}. It expires in ${ttlMinutes} minutes.`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                        <h2>Verification Code</h2>
                        <p>Your OTP for VornLiving is:</p>
                        <h1 style="color: #4A90E2; letter-spacing: 5px;">${otp}</h1>
                        <p>This code expires in ${ttlMinutes} minutes. Do not share it with anyone.</p>
                    </div>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            console.log(`[EMAIL] OTP sent to ${email} (ID: ${info.messageId})`);
        } else {
            console.warn("[EMAIL] Missing EMAIL_USER/EMAIL_PASS. OTP generated but not emailed (dev mode).");
        }
        
        const host = String(req.hostname || '').toLowerCase();
        const ip = String(req.ip || '');
        const isLocal = host === 'localhost' || host === '127.0.0.1' || ip === '::1' || ip === '127.0.0.1';
        const canReturnDebug = isLocal;

        res.status(200).json({
            success: true,
            message: "OTP sent successfully to " + email,
            ttlSeconds,
            ...(canReturnDebug ? { debugOtp: otp } : {})
        });
    } catch (error) {
        console.error("Error sending email OTP:", error);
        res.status(500).json({ message: "Failed to send email. Check server logs." });
    }
};

const verifyEmailOtp = async (req, res) => {
    const { email, otp, type } = req.body;
    try {
        const otpType = String(type || 'checkout');
        const lowerType = otpType.toLowerCase();
        const isCheckout = lowerType === 'checkout';
        const key = `${lowerType}:${String(email || '').trim().toLowerCase()}`;
        const inMem = emailOtpStore.get(key);
        if (isCheckout && inMem) {
            if (Number(inMem.expiresAtMs || 0) <= Date.now()) {
                emailOtpStore.delete(key);
                return res.status(400).json({ message: "OTP expired" });
            }
            if (String(inMem.otp) !== String(otp || '').trim()) {
                return res.status(400).json({ message: "Invalid OTP" });
            }
            emailOtpStore.delete(key);
            return res.status(200).json({ success: true, message: "OTP Verified", verified: true });
        }

        const otpRecord = await authModel.getLatestOtp(email, otpType);
        if (!otpRecord || otpRecord.OTPCode !== otp) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        await authModel.markOtpAsUsed(otpRecord.OTPID);

        if (otpType === 'Login') {
            const user = await authModel.getUserByEmail(email);
            if (user) {
                // Proactively claim any guest orders associated with this email
                try {
                    await orderModel.claimGuestOrders(user.UserID, email);
                } catch (claimErr) {
                    console.error("Failed to claim guest orders upon login:", claimErr);
                }
            }
            return res.status(200).json({ success: true, message: "Login successful", user });
        } else {
            return res.status(200).json({ success: true, message: "OTP Verified", verified: true });
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const normalizePhone10 = (value) => String(value || '').replace(/\D/g, '').slice(-10);
const isValidIndianMobile = (digits10) => /^[6-9]\d{9}$/.test(String(digits10 || ''));
const phoneOtpStore = new Map();
const emailOtpStore = new Map();

const sendPhoneOtp = async (req, res) => {
    const { phone, type } = req.body || {};
    const phone10 = normalizePhone10(phone);
    const otpType = String(type || 'checkout');

    if (!isValidIndianMobile(phone10)) {
        return res.status(400).json({ message: "Enter a valid 10-digit Indian mobile number." });
    }

    try {
        // Strictly use 4-digit OTP for all cases
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const expiresAtMs = Date.now() + 5 * 60 * 1000;
        phoneOtpStore.set(`${otpType}:${phone10}`, { otp, expiresAtMs });

        try {
            await authModel.savePhoneOtp(phone10, otp, otpType, 5);
        } catch (dbErr) {
            console.error("Phone OTP DB save failed (falling back to in-memory store):", dbErr);
        }

        const provider = String(process.env.SMS_PROVIDER || '').toLowerCase();
        if (provider === 'twilio') {
            const sid = process.env.TWILIO_ACCOUNT_SID;
            const token = process.env.TWILIO_AUTH_TOKEN;
            const from = process.env.TWILIO_FROM;
            if (!sid || !token || !from) {
                return res.status(500).json({ message: "Twilio is not configured on server." });
            }
            try {
                const twilio = require('twilio')(sid, token);
                await twilio.messages.create({
                    from,
                    to: `+91${phone10}`,
                    body: `Your VornLiving OTP is ${otp}. It is valid for 5 minutes. Do not share it.`,
                });
                return res.status(200).json({ success: true, message: "OTP sent", ttlSeconds: 300 });
            } catch (smsErr) {
                console.error("Twilio SMS send failed:", smsErr);
            }
        }

        const host = String(req.hostname || '').toLowerCase();
        const ip = String(req.ip || '');
        const isLocal = host === 'localhost' || host === '127.0.0.1' || ip === '::1' || ip === '127.0.0.1';
        const canReturnDebug = provider !== 'twilio' && isLocal;

        return res.status(200).json({
            success: true,
            message: "OTP sent",
            ttlSeconds: 300,
            ...(canReturnDebug ? { debugOtp: otp } : {})
        });
    } catch (error) {
        console.error("Error sending phone OTP:", error);
        return res.status(500).json({ message: "Failed to send OTP" });
    }
};

const verifyPhoneOtp = async (req, res) => {
    const { phone, otp, type } = req.body || {};
    const phone10 = normalizePhone10(phone);
    const code = String(otp || '').trim();
    const otpType = String(type || 'checkout');

    if (!isValidIndianMobile(phone10)) {
        return res.status(400).json({ message: "Enter a valid 10-digit Indian mobile number." });
    }
    if (!/^\d{4}$/.test(code)) {
        return res.status(400).json({ message: "Enter a valid 4-digit OTP." });
    }

    try {
        const inMem = phoneOtpStore.get(`${otpType}:${phone10}`);
        if (inMem) {
            if (Number(inMem.expiresAtMs || 0) <= Date.now()) {
                phoneOtpStore.delete(`${otpType}:${phone10}`);
                return res.status(400).json({ message: "OTP expired" });
            }
            if (String(inMem.otp) !== code) {
                return res.status(400).json({ message: "Invalid OTP" });
            }
            phoneOtpStore.delete(`${otpType}:${phone10}`);
            return res.status(200).json({ success: true, message: "OTP verified" });
        }

        const record = await authModel.getLatestPhoneOtp(phone10, otpType);
        if (!record) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        const expiresAt = record.ExpiresAt ? new Date(record.ExpiresAt) : null;
        if (!expiresAt || expiresAt.getTime() <= Date.now()) {
            return res.status(400).json({ message: "OTP expired" });
        }

        if (String(record.OTPCode) !== code) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        await authModel.markOtpAsUsed(record.OTPID);
        return res.status(200).json({ success: true, message: "OTP verified" });
    } catch (error) {
        console.error("Error verifying phone OTP:", error);
        return res.status(500).json({ message: "Server Error" });
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
        
        // Claim guest orders for the newly registered user
        try {
            await orderModel.claimGuestOrders(newUser.UserID, email);
        } catch (claimErr) {
            console.error("Failed to claim guest orders upon registration:", claimErr);
        }

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
    sendPhoneOtp,
    verifyPhoneOtp,
    registerUser
};
