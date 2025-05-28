    import { importPKCS8, exportJWK } from "jose";
    import { readFileSync } from "fs";

    async function generateJwks() {
      try {
        // Read your existing private key file
        const privateKeyPem = readFileSync("jwt-private-key-pkcs8.pem", "utf8");

        // Log the PEM content (optional, be careful with sensitive data)
        // console.log("Read private key PEM:", privateKeyPem);

        // Import the private key
        const privateKey = await importPKCS8(privateKeyPem, "RS256");

        // Log the imported privateKey object
        console.log("Imported privateKey object:", privateKey);
        console.log("privateKey.publicJwk:", privateKey.publicJwk);

        // Export the public key from the key pair as a JWK
        const publicKey = await exportJWK(privateKey.publicJwk);

        // Format as a JWK set
        const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

        process.stdout.write(jwks);
        process.stdout.write("\n");

      } catch (error) {
        console.error("Error generating JWKS:", error);
        process.exit(1);
      }
    }

    generateJwks();