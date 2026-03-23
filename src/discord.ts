import nacl from 'tweetnacl';

/**
 * Converts a hexadecimal string to a Uint8Array.
 */
function hexToUint8Array(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));
}

/**
 * Verifies the signature of an incoming Discord interaction request.
 * @param request The incoming request from Discord.
 * @param publicKey The application's public key (in hex format).
 * @returns True if the signature is valid, false otherwise.
 */
export async function verifyDiscordRequest(request: Request, publicKey: string): Promise<boolean> {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.clone().text();

  if (!signature || !timestamp) {
    return false;
  }

  const encoder = new TextEncoder();
  const message = encoder.encode(timestamp + body);
  const signatureBytes = hexToUint8Array(signature);
  const publicKeyBytes = hexToUint8Array(publicKey);

  try {
    return nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}
