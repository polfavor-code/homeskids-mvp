/**
 * Generate VAPID keys for Web Push notifications
 * 
 * Run with: npx ts-node scripts/generate-vapid-keys.ts
 * 
 * After running, add the keys to:
 * 1. NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local and Vercel
 * 2. VAPID_PRIVATE_KEY in Supabase Edge Function secrets
 */

// Using Web Crypto API to generate VAPID keys
async function generateVapidKeys() {
    // Generate an ECDSA key pair using P-256 curve
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "ECDSA",
            namedCurve: "P-256",
        },
        true,
        ["sign", "verify"]
    );

    // Export the public key
    const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyBase64 = Buffer.from(publicKeyBuffer).toString("base64url");

    // Export the private key
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    const privateKeyBase64 = privateKeyJwk.d!;

    console.log("\n========================================");
    console.log("VAPID Keys Generated Successfully!");
    console.log("========================================\n");
    
    console.log("Add these to your environment:\n");
    
    console.log("1. In .env.local and Vercel (public):");
    console.log(`   NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKeyBase64}\n`);
    
    console.log("2. In Supabase Edge Function secrets (private):");
    console.log(`   VAPID_PRIVATE_KEY=${privateKeyBase64}\n`);
    
    console.log("3. Also add your contact email:");
    console.log(`   VAPID_SUBJECT=mailto:your-email@example.com\n`);
    
    console.log("========================================\n");
}

generateVapidKeys().catch(console.error);
