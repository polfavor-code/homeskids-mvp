import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// SVG content for the logo icon
const createIconSvg = (size, cornerRadius) => {
    // Scale houses - size/110 for balanced size
    const scale = size / 110;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2C3E2D"/>
      <stop offset="100%" stop-color="#4CA1AF"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${cornerRadius}" fill="url(#bg)"/>
  <g transform="translate(${size/2}, ${size/2}) scale(${scale}) translate(-60, -55)">
    <path d="M15 45V75H45V45L30 30Z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="white" fill-opacity="0.3" opacity="0.7"/>
    <path d="M75 45V75H105V45L90 30Z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="white" fill-opacity="0.3" opacity="0.7"/>
    <path d="M35 85V50L60 25L85 50V85H35Z" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="white" fill-opacity="0.3"/>
  </g>
</svg>`;
};

// Favicon SVG - smaller scale to add padding around houses
const createFaviconSvg = (size) => {
    const scale = size / 105;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2C3E2D"/>
      <stop offset="100%" stop-color="#4CA1AF"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(${size/2}, ${size/2}) scale(${scale}) translate(-60, -55)">
    <path d="M15 45V75H45V45L30 30Z" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="white" fill-opacity="0.3" opacity="0.7"/>
    <path d="M75 45V75H105V45L90 30Z" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="white" fill-opacity="0.3" opacity="0.7"/>
    <path d="M35 85V50L60 25L85 50V85H35Z" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="white" fill-opacity="0.3"/>
  </g>
</svg>`;
};

async function convertIcons() {
    console.log('Converting icons...');
    
    // 192x192 icon
    const svg192 = Buffer.from(createIconSvg(192, 38));
    await sharp(svg192)
        .png()
        .toFile(join(iconsDir, 'icon-192.png'));
    console.log('✓ Created icon-192.png');
    
    // 512x512 icon
    const svg512 = Buffer.from(createIconSvg(512, 102));
    await sharp(svg512)
        .png()
        .toFile(join(iconsDir, 'icon-512.png'));
    console.log('✓ Created icon-512.png');
    
    // 180x180 apple-touch-icon (no rounded corners - iOS adds them)
    const svg180 = Buffer.from(createIconSvg(180, 0));
    await sharp(svg180)
        .png()
        .toFile(join(publicDir, 'apple-touch-icon.png'));
    console.log('✓ Created apple-touch-icon.png');
    
    // 32x32 favicon
    const svg32 = Buffer.from(createFaviconSvg(32));
    await sharp(svg32)
        .png()
        .toFile(join(publicDir, 'favicon-32x32.png'));
    console.log('✓ Created favicon-32x32.png');
    
    // 16x16 favicon
    const svg16 = Buffer.from(createFaviconSvg(16));
    await sharp(svg16)
        .png()
        .toFile(join(publicDir, 'favicon-16x16.png'));
    console.log('✓ Created favicon-16x16.png');
    
    // favicon.ico (use 32x32 as base)
    const svg48 = Buffer.from(createFaviconSvg(48));
    await sharp(svg48)
        .png()
        .toFile(join(publicDir, 'favicon.png'));
    console.log('✓ Created favicon.png');
    
    console.log('Done! Icons regenerated.');
}

convertIcons().catch(console.error);
