import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { writeFileSync } from "fs";
import path from 'path'; // Import the path module

async function generateKeys() {
  try {
    // Generate a new RS256 key pair
    const keys = await generateKeyPair("RS256", {
      extractable: true,
    });

    // Export the private key in PKCS8 PEM format
    const privateKeyPem = await exportPKCS8(keys.privateKey);

    // Export the public key in JWK format
    const publicKeyJwk = await exportJWK(keys.publicKey);

    // Format as a JWK set
    const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKeyJwk }] });

    // Define output file paths
    const privateKeyFile = path.join(process.cwd(), 'new_jwt_private_key.pem');
    const jwksFile = path.join(process.cwd(), 'new_jwks.json');

    // Write keys to files
    writeFileSync(privateKeyFile, privateKeyPem);
    writeFileSync(jwksFile, jwks);

    console.log(`New JWT Private Key saved to: ${privateKeyFile}`);
    console.log(`New JWKS saved to: ${jwksFile}`);

  } catch (error) {
    console.error("Error generating keys:", error);
    process.exit(1);
  }
}

generateKeys();