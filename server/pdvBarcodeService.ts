// eslint-disable-next-line @typescript-eslint/no-require-imports
const bwipjs = require("bwip-js") as { toBuffer: (opts: Record<string, unknown>) => Promise<Buffer> };

/** Gera um EAN-13 válido com prefixo brasileiro (789) */
export function generateEAN13(): string {
  const prefix = "789";
  const randomDigits = Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
  const partial = prefix + randomDigits;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(partial[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return partial + check;
}

/** Gera PNG do código de barras e retorna Buffer */
export async function generateBarcodeImage(
  barcode: string,
  options: { width?: number; height?: number; includeText?: boolean } = {}
): Promise<Buffer> {
  const { width = 2, height = 50, includeText = true } = options;
  return bwipjs.toBuffer({
    bcid: "ean13",
    text: barcode,
    scale: width,
    height,
    includetext: includeText,
    textxalign: "center",
  });
}

/** Valida checksum EAN-13 */
export function validateEAN13(barcode: string): boolean {
  if (!/^\d{13}$/.test(barcode)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(barcode[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10 === parseInt(barcode[12]);
}
