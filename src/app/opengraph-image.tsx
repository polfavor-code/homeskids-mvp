import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'homes.kids - Everything your child needs between homes';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(135deg, #2C3E2D 0%, #4CA1AF 100%)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* 3 Houses Logo - SVG as component */}
                <svg
                    width="320"
                    height="200"
                    viewBox="5 20 110 65"
                    style={{ marginBottom: 24 }}
                >
                    {/* House 1 (Left, Back) */}
                    <path
                        d="M15 45V75H45V45L30 30Z"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="white"
                        fillOpacity="0.3"
                        opacity="0.7"
                    />
                    {/* House 2 (Right, Back) */}
                    <path
                        d="M75 45V75H105V45L90 30Z"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="white"
                        fillOpacity="0.3"
                        opacity="0.7"
                    />
                    {/* House 3 (Center, Front) */}
                    <path
                        d="M35 85V50L60 25L85 50V85H35Z"
                        stroke="white"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="white"
                        fillOpacity="0.3"
                    />
                </svg>

                {/* Title */}
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 400,
                        color: 'white',
                        fontFamily: 'serif',
                        marginBottom: 16,
                    }}
                >
                    homes.kids
                </div>

                {/* Tagline */}
                <div
                    style={{
                        fontSize: 28,
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontFamily: 'sans-serif',
                    }}
                >
                    Everything your child needs between homes.
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
