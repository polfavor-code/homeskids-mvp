import { ImageResponse } from 'next/og';

export const size = {
    width: 180,
    height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'white',
                }}
            >
                <svg
                    width="160"
                    height="160"
                    viewBox="5 20 110 70"
                >
                    <defs>
                        <linearGradient id="appleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2C3E2D" />
                            <stop offset="100%" stopColor="#4CA1AF" />
                        </linearGradient>
                    </defs>
                    {/* House 1 (Left, Back) */}
                    <path
                        d="M15 45V75H45V45L30 30Z"
                        stroke="url(#appleGrad)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="url(#appleGrad)"
                        fillOpacity="0.15"
                        opacity="0.7"
                    />
                    {/* House 2 (Right, Back) */}
                    <path
                        d="M75 45V75H105V45L90 30Z"
                        stroke="url(#appleGrad)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="url(#appleGrad)"
                        fillOpacity="0.15"
                        opacity="0.7"
                    />
                    {/* House 3 (Center, Front) */}
                    <path
                        d="M35 85V50L60 25L85 50V85H35Z"
                        stroke="url(#appleGrad)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="url(#appleGrad)"
                        fillOpacity="0.15"
                    />
                    {/* Ground Line */}
                    <path
                        d="M5 88H115"
                        stroke="url(#appleGrad)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />
                </svg>
            </div>
        ),
        {
            ...size,
        }
    );
}
