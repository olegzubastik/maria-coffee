// Перевірка підпису вебхука monobank (заголовок X-Sign).
// monobank: ECDSA P-256 + SHA-256, підпис у форматі ASN.1 DER (base64),
// публічний ключ — base64 від PEM. WebCrypto приймає лише «сирий» підпис r||s,
// тому конвертуємо DER вручну. Без залежностей — тестується в Node.

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export async function importMonoPubKey(keyBase64: string): Promise<CryptoKey> {
  const pem = new TextDecoder().decode(b64ToBytes(keyBase64));
  const body = pem.replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  return crypto.subtle.importKey('spki', b64ToBytes(body), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
}

// DER: 30 len 02 lenR R 02 lenS S  ->  R(32) || S(32)
export function derToRaw(der: Uint8Array): Uint8Array<ArrayBuffer> {
  let i = 0;
  if (der[i++] !== 0x30) throw new Error('bad DER');
  if (der[i] & 0x80) i += 1 + (der[i] & 0x7f); else i++;
  const readInt = () => {
    if (der[i++] !== 0x02) throw new Error('bad DER int');
    const len = der[i++];
    let v = der.slice(i, i + len);
    i += len;
    while (v.length > 32 && v[0] === 0) v = v.slice(1);
    if (v.length > 32) throw new Error('bad DER int length');
    const out = new Uint8Array(32);
    out.set(v, 32 - v.length);
    return out;
  };
  const r = readInt();
  const s = readInt();
  const raw = new Uint8Array(64);
  raw.set(r, 0);
  raw.set(s, 32);
  return raw;
}

export async function verifyMonoSignature(key: CryptoKey, signBase64: string, body: Uint8Array<ArrayBuffer>): Promise<boolean> {
  try {
    const raw = derToRaw(b64ToBytes(signBase64));
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, raw, body);
  } catch {
    return false;
  }
}
