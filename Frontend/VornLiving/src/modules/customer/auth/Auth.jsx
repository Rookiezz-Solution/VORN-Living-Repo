import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { registerUser, sendEmailOtp, verifyEmailOtp, checkUserExists, mergeGuestCartIntoUserCart } from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';

const Auth = () => {
    const { showNotification } = useNotification();
    const [mode, setMode] = useState('LOGIN'); // 'LOGIN' or 'SIGNUP'
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [profile, setProfile] = useState({ fullName: '', phoneNumber: '' });
    const [timer, setTimer] = useState(0); // Timer for Resend OTP
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Check if user is already logged in
        const user = localStorage.getItem('user');
        if (user) {
            // Redirect to previous page if available, else profile
            const from = location.state?.from || '/profile';
            navigate(from, { replace: true });
        }
    }, [navigate, location]);

    // Timer countdown effect
    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSendOtp = async (e) => {
        if (e && e.preventDefault) e.preventDefault(); // Optional for direct calls
        if (email && email.includes('@')) {
            try {
                // 1. Check if user exists BEFORE sending OTP (Only if step is 1)
                if (step === 1) {
                    try {
                        const { exists } = await checkUserExists(email);

                        if (mode === 'LOGIN' && !exists) {
                            showNotification("User not found. Please Sign Up first.", 'error');
                            setMode('SIGNUP');
                            return;
                        }
                        
                        if (mode === 'SIGNUP' && exists) {
                            showNotification("User already exists. Please Login.", 'info');
                            setMode('LOGIN');
                            return;
                        }
                    } catch (apiError) {
                        console.error("API Check Error:", apiError);
                        showNotification("Network Error: Could not verify user status. " + apiError.message, 'error');
                        return;
                    }
                }

                // 2. If checks pass, send OTP via Email
                const type = mode === 'LOGIN' ? 'Login' : 'Signup';
                const response = await sendEmailOtp(email, type);
                
                setStep(2);
                setTimer(60); // Start 60s timer
                showNotification(`OTP sent to ${email}`, 'success');

                // Development Mode: Show Preview URL if available
                if (response.previewUrl) {
                    console.log("OTP Preview URL:", response.previewUrl);
                    // Add a slight delay to ensure the success toast doesn't override this one
                    setTimeout(() => {
                        showNotification(
                            <span>
                                Dev Mode: <a href={response.previewUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">Click here for OTP</a>
                            </span>, 
                            'info', 
                            10000 // Show for 10 seconds
                        );
                    }, 500);
                }
            } catch (error) {
                console.error("Auth Error:", error);
                showNotification("Failed to send OTP. " + (error.message || ""), 'error');
            }
        } else {
            showNotification("Please enter a valid email address", 'error');
        }
    };

    const resendOtp = async () => {
        if (timer > 0) return;
        try {
            const type = mode === 'LOGIN' ? 'Login' : 'Signup';
            const response = await sendEmailOtp(email, type);
            setTimer(60);
            showNotification(`OTP resent to ${email}`, 'success');
            
            // Dev Mode preview again
            if (response.previewUrl) {
                console.log("OTP Preview URL:", response.previewUrl);
                setTimeout(() => {
                    showNotification(
                        <span>
                            Dev Mode: <a href={response.previewUrl} target="_blank" rel="noopener noreferrer" className="underline font-bold">Click here for OTP</a>
                        </span>, 
                        'info', 
                        10000
                    );
                }, 500);
            }
        } catch (error) {
            console.error("Resend OTP Error:", error);
            showNotification("Failed to resend OTP", 'error');
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        try {
            const type = mode === 'LOGIN' ? 'Login' : 'Signup';
            const response = await verifyEmailOtp(email, otp, type);
            
            if (mode === 'LOGIN') {
                localStorage.setItem('user', JSON.stringify(response.user));
                window.dispatchEvent(new Event('userUpdated')); // Update Header
                await mergeGuestCartIntoUserCart(response.user?.UserID);
                window.dispatchEvent(new Event('cartUpdated'));
                showNotification("Login successful!", 'success');
                // Use location state to redirect back if applicable
                const from = location.state?.from || '/profile';
                navigate(from, { replace: true });
            } else {
                // Signup flow: OTP verified, now fill details
                setStep(3);
                showNotification("Email verified! Please complete profile.", 'success');
            }
        } catch (error) {
            console.error("Verification Error:", error);
            showNotification(error.message || "Invalid OTP", 'error');
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const response = await registerUser({ email, ...profile });
            localStorage.setItem('user', JSON.stringify(response.user));
            window.dispatchEvent(new Event('userUpdated')); // Update Header
            await mergeGuestCartIntoUserCart(response.user?.UserID);
            window.dispatchEvent(new Event('cartUpdated'));
            showNotification("Registration successful!", 'success');
            // Use location state to redirect back if applicable
            const from = location.state?.from || '/profile';
            navigate(from, { replace: true });
        } catch (error) {
            showNotification(error.message || "Registration failed.", 'error');
        }
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setStep(1);
        setOtp('');
        setProfile({ fullName: '', phoneNumber: '' });
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden animate-fade-in">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/heroSectionImg/LaptopStand.jpeg')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/35 to-black/15" />
            <div className="absolute inset-0 bg-hero-gradient opacity-80" />

            <div className={`max-w-md w-full rf-card p-8 animate-slide-up backdrop-blur-md border border-white/30 relative z-10 bg-background'}`}>
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-secondary">
                        {step === 3 ? 'Complete Profile' : (mode === 'LOGIN' ? 'Welcome Back' : 'Create Account')}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {step === 1 ? 'Enter your email to continue' : step === 2 ? `Sent to ${email}` : 'Tell us a bit about yourself'}
                    </p>
                </div>

                {/* Mode Switcher */}
                {step === 1 && (
                    <div className="flex justify-center mt-6 mb-4">
                        <div className="bg-background p-1 rounded-xl flex w-full max-w-xs border border-border">
                            <button
                                onClick={() => switchMode('LOGIN')}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === 'LOGIN' ? 'bg-white shadow text-secondary' : 'text-gray-500 hover:text-secondary'}`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => switchMode('SIGNUP')}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${mode === 'SIGNUP' ? 'bg-white shadow text-secondary' : 'text-gray-500 hover:text-secondary'}`}
                            >
                                Sign Up
                            </button>
                        </div>
                    </div>
                )}

                {step === 1 && (
                    <form className="mt-4 space-y-6" onSubmit={handleSendOtp}>
                        <div>
                            <label htmlFor="email" className="sr-only">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                required
                                className="rf-input w-full text-secondary placeholder:text-secondary/70"
                                placeholder="Email Address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full rf-btn-primary py-3 px-4 text-sm transition"
                        >
                            {mode === 'LOGIN' ? 'Send Login OTP' : 'Verify Email'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
                        <div>
                            <label htmlFor="otp" className="sr-only">OTP</label>
                            <input
                                id="otp"
                                type="text"
                                required
                                className="rf-input w-full text-secondary placeholder:text-secondary/40 text-center tracking-widest text-2xl"
                                placeholder="• • • •"
                                maxLength={4}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full rf-btn-primary py-3 px-4 text-sm transition"
                        >
                            Verify & {mode === 'LOGIN' ? 'Login' : 'Continue'}
                        </button>
                        <div className="text-center mt-4">
                            {timer > 0 ? (
                                <p className="text-sm text-gray-500">Resend OTP in <span className="font-bold">{timer}s</span></p>
                            ) : (
                                <button type="button" onClick={resendOtp} className="text-sm font-semibold text-primary hover:underline">
                                    Resend OTP
                                </button>
                            )}
                        </div>
                        <div className="text-center mt-2">
                            <button type="button" onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">
                                Change Email
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form className="mt-8 space-y-6" onSubmit={handleRegister}>
                        <div className="space-y-4">
  <div>
    <label htmlFor="name" className="block text-sm text-secondary mb-1">
      Full Name <span className="text-red-500 ml-0.5">*</span>
    </label>
    <input
      id="name"
      name="name"
      type="text"
      required
      className="rf-input w-full text-secondary placeholder:text-secondary/70"
      placeholder="Full Name"
      value={profile.fullName}
      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
    />
  </div>

  <div>
    <label htmlFor="phone" className="block text-sm text-secondary mb-1">
      Phone Number <span className="text-red-500 ml-0.5">*</span>
    </label>
    <input
      id="phone"
      name="phone"
      type="tel"
      required
      className="rf-input w-full text-secondary placeholder:text-secondary/70"
      placeholder="Phone Number"
      value={profile.phoneNumber}
      onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
    />
  </div>
</div>

                        <button
                            type="submit"
                            className="w-full rf-btn-primary py-3 px-4 text-sm transition"
                        >
                            Complete Registration
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Auth;
