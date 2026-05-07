const newsletterModel = require('../models/newsletterModel');
const nodemailer = require('nodemailer');

// Configure Nodemailer (Reusing credentials from Auth Controller)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendWelcomeEmail = async (email) => {
    const mailOptions = {
        from: '"VornLiving" <no-reply@vornliving.com>',
        to: email,
        subject: 'Welcome to VornLiving! 🛋️',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h1 style="color: #4A90E2; text-align: center;">Welcome to the Family!</h1>
                <p>Hi there,</p>
                <p>Thank you for subscribing to the VornLiving newsletter! We're thrilled to have you with us.</p>
                <p>You'll now be the first to know about:</p>
                <ul>
                    <li>Exclusive furniture launches</li>
                    <li>Interior design tips & trends</li>
                    <li>Special subscriber-only offers</li>
                </ul>
                <p>As a welcome gift, here is a <strong>10% OFF</strong> coupon code for your next purchase:</p>
                <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; font-weight: bold; font-size: 20px; letter-spacing: 2px;">
                    WELCOME10
                </div>
                <p style="margin-top: 20px;">Happy Shopping!</p>
                <p>The VornLiving Team</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">If you didn't subscribe, you can ignore this email.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] Welcome email sent to ${email}`);
    } catch (error) {
        console.error("Failed to send welcome email:", error);
    }
};

const subscribe = async (req, res) => {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Please provide a valid email address." });
    }

    try {
        const result = await newsletterModel.subscribe(email);
        
        // Only send welcome email if subscription was successful (and new/reactivated)
        if (result.message.includes("Thank you") || result.message.includes("Welcome back")) {
            // Send email asynchronously (don't wait for it to block response)
            sendWelcomeEmail(email);
        }

        res.status(200).json(result);
    } catch (error) {
        console.error("Newsletter Subscription Error:", error);
        res.status(500).json({ message: "Failed to subscribe. Please try again later." });
    }
};

module.exports = {
    subscribe
};