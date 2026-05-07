import React from 'react';

const FurnitureStrip = () => {
    return (
        <div className="relative mt-10">
            <div className="overflow-hidden border-t border-white/10 pt-6">
                <div className="marquee gap-6 items-center text-white/25 dark:text-white/35">
                    {/* Repeatable silhouette set */}
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center gap-6">
                            <svg width="80" height="28" viewBox="0 0 80 28" className="opacity-75 spin-slow">
                                <rect x="8" y="16" width="64" height="8" rx="4" fill="currentColor" />
                                <rect x="20" y="8" width="40" height="10" rx="5" fill="currentColor" />
                            </svg>
                            <svg width="36" height="36" viewBox="0 0 36 36" className="opacity-70 spin-slow">
                                <rect x="17" y="10" width="2" height="14" fill="currentColor" />
                                <path d="M12 10 L24 10 L21 6 L15 6 Z" fill="currentColor" />
                                <rect x="14" y="24" width="8" height="3" rx="1.5" fill="currentColor" />
                            </svg>
                            <svg width="80" height="28" viewBox="0 0 80 28" className="opacity-75 spin-slow">
                                <rect x="10" y="18" width="60" height="4" rx="2" fill="currentColor" />
                                <rect x="14" y="10" width="16" height="6" rx="3" fill="currentColor" />
                                <rect x="34" y="10" width="16" height="6" rx="3" fill="currentColor" />
                                <rect x="54" y="10" width="12" height="6" rx="3" fill="currentColor" />
                            </svg>
                        </div>
                    ))}
                </div>
            </div>
            <div className="absolute inset-0 pointer-events-none">
                <div className="rotate-slow w-24 h-24 rounded-full border border-white/25 dark:border-white/35 mx-auto mt-[-3rem]"></div>
            </div>
        </div>
    );
};

export default FurnitureStrip;
