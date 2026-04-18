import React, { useEffect, useState } from 'react';
import { Loader, Truck, Star } from 'lucide-react';

const animationStyles = `
@keyframes driveRight { 0% { transform: translateX(-60%); } 100% { transform: translateX(120%); } }
@keyframes sway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
@keyframes float { 0% { transform: translateY(0); } 50% { transform: translateY(-6px); } 100% { transform: translateY(0); } }
@keyframes beltRight { 0% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
@keyframes spin { to { transform: rotate(360deg); } }
`;

const GlobalLoader = () => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const start = () => setCount(c => c + 1);
        const end = () => setCount(c => Math.max(0, c - 1));
        window.addEventListener('api:request-start', start);
        window.addEventListener('api:request-end', end);
        return () => {
            window.removeEventListener('api:request-start', start);
            window.removeEventListener('api:request-end', end);
        };
    }, []);
    if (count <= 0) return null;
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <style>{animationStyles}</style>
            <div className="relative w-full max-w-xl mx-auto p-8 rounded-2xl bg-white border border-border shadow-xl text-center">
                <div className="flex items-center justify-center gap-6 mb-4">
                    <div className="h-16 w-16 rounded-xl bg-blue-100 border border-blue-200 shadow flex items-center justify-center animate-[float_1.8s_ease-in-out_infinite]">
                        <svg width="42" height="26" viewBox="0 0 42 26">
                            <rect x="6" y="10" width="30" height="8" rx="3" fill="#93C5FD" />
                            <rect x="10" y="4" width="22" height="8" rx="3" fill="#BFDBFE" />
                            <circle cx="14" cy="20" r="2" fill="#374151" />
                            <circle cx="28" cy="20" r="2" fill="#374151" />
                        </svg>
                    </div>
                    <div className="h-16 w-16 rounded-xl bg-yellow-100 border border-yellow-200 shadow flex items-center justify-center animate-[sway_1.6s_ease-in-out_infinite]">
                        <svg width="36" height="36" viewBox="0 0 36 36">
                            <rect x="17" y="10" width="2" height="14" fill="#6B7280" />
                            <path d="M12 10 L24 10 L21 6 L15 6 Z" fill="#FDE68A" stroke="#FCD34D" />
                            <rect x="14" y="24" width="8" height="3" rx="1.5" fill="#9CA3AF" />
                        </svg>
                    </div>
                    <div className="h-16 w-16 rounded-xl bg-green-100 border border-green-200 shadow flex items-center justify-center animate-[float_2s_ease-in-out_infinite]">
                        <svg width="42" height="26" viewBox="0 0 42 26">
                            <rect x="6" y="18" width="30" height="4" rx="2" fill="#86EFAC" />
                            <rect x="8" y="12" width="8" height="6" rx="2" fill="#BBF7D0" />
                            <rect x="18" y="12" width="8" height="6" rx="2" fill="#BBF7D0" />
                            <rect x="28" y="12" width="6" height="6" rx="2" fill="#BBF7D0" />
                        </svg>
                    </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-secondary mt-4">
                    <Loader className="h-5 w-5 animate-spin text-primary" />
                    <span className="font-semibold">Preparing your room setup…</span>
                </div>
                <div className="mt-2 text-xs text-gray-500 flex items-center justify-center gap-1">
                    <Star className="h-4 w-4" /> <span>Please wait</span>
                </div>
            </div>
        </div>
    );
};

export default GlobalLoader;
