import React from 'react';

const AmbientBackground = () => {
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-0">
            <div className="container">
                <div className="relative h-24">
                    <svg className="absolute left-0 bottom-0 opacity-20" width="220" height="90" viewBox="0 0 220 90">
                        <rect x="30" y="60" width="160" height="20" rx="10" fill="currentColor" />
                        <rect x="60" y="35" width="100" height="28" rx="12" fill="currentColor" />
                    </svg>
                    <svg className="absolute right-0 bottom-0 opacity-10" width="200" height="80" viewBox="0 0 200 80">
                        <rect x="20" y="55" width="160" height="12" rx="6" fill="currentColor" />
                        <rect x="40" y="32" width="40" height="18" rx="8" fill="currentColor" />
                        <rect x="90" y="32" width="40" height="18" rx="8" fill="currentColor" />
                        <rect x="140" y="32" width="30" height="18" rx="8" fill="currentColor" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default AmbientBackground;

