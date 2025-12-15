import { ImageResponse } from 'next/og';

export const size = {
    width: 32,
    height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
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
                    width="30"
                    height="30"
                    viewBox="5 20 110 70"
                >
                    <defs>
                        <linearGradient id="iconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2C3E2D" />
                            <stop offset="100%" stopColor="#4CA1AF" />
                        </linearGradient>
                    </defs>
                    {/* House 1 (Left, Back) */}
                    <path
                        d="M15 45V75H45V45L30 30Z"
                        stroke="url(#iconGrad)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="url(#iconGrad)"
                        fillOpacity="0.2"
                        opacity="0.7"
                    />
                    {/* House 2 (Right, Back) */}
                    <path
                        d="M75 45V75H105V45L90 30Z"
                        stroke="url(#iconGrad)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="url(#iconGrad)"
                        fillOpacity="0.2"
                        opacity="0.7"
                    />
                    {/* House 3 (Center, Front) */}
                    <path
                        d="M35 85V50L60 25L85 50V85H35Z"
                        stroke="url(#iconGrad)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="url(#iconGrad)"
                        fillOpacity="0.2"
                    />
                    {/* Ground Line */}
                    <path
                        d="M5 88H115"
                        stroke="url(#iconGrad)"
                        strokeWidth="5"
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
