type VersionConfig = {
  version: number;
  size: number;
  dataCodewords: number;
  ecCodewordsPerBlock: number;
  blockDataCodewords: number[];
  alignment: number[];
};

const VERSION_CONFIGS: VersionConfig[] = [
  { version: 5, size: 37, dataCodewords: 108, ecCodewordsPerBlock: 26, blockDataCodewords: [108], alignment: [6, 30] },
  { version: 6, size: 41, dataCodewords: 136, ecCodewordsPerBlock: 18, blockDataCodewords: [68, 68], alignment: [6, 34] },
  { version: 7, size: 45, dataCodewords: 156, ecCodewordsPerBlock: 20, blockDataCodewords: [78, 78], alignment: [6, 22, 38] },
  { version: 8, size: 49, dataCodewords: 194, ecCodewordsPerBlock: 24, blockDataCodewords: [97, 97], alignment: [6, 24, 42] },
  { version: 9, size: 53, dataCodewords: 232, ecCodewordsPerBlock: 30, blockDataCodewords: [116, 116], alignment: [6, 26, 46] },
];

function appendBits(target: number[], value: number, count: number) {
  for (let i = count - 1; i >= 0; i -= 1) target.push((value >>> i) & 1);
}

function gfMultiply(a: number, b: number) {
  let x = a;
  let y = b;
  let result = 0;
  while (y > 0) {
    if (y & 1) result ^= x;
    y >>>= 1;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  return result;
}

function reedSolomonDivisor(degree: number) {
  const result = Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < degree; j += 1) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 2);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]) {
  const result = Array<number>(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.copyWithin(0, 1);
    result[result.length - 1] = 0;
    for (let i = 0; i < divisor.length; i += 1) {
      result[i] ^= gfMultiply(divisor[i], factor);
    }
  }
  return result;
}

function chooseVersion(byteLength: number) {
  const requiredBits = 4 + 8 + byteLength * 8;
  const config = VERSION_CONFIGS.find((candidate) => requiredBits <= candidate.dataCodewords * 8);
  if (!config) throw new Error("MFA setup URI is too long to render as a local QR code.");
  return config;
}

function makeCodewords(value: string, config: VersionConfig) {
  const bytes = Array.from(new TextEncoder().encode(value));
  if (bytes.length > 255) throw new Error("MFA setup URI is too long.");

  const bits: number[] = [];
  appendBits(bits, 0b0100, 4); // Byte mode.
  appendBits(bits, bytes.length, 8); // Versions 1-9 use an 8-bit byte count.
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacityBits = config.dataCodewords * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    data.push(byte);
  }

  const padBytes = [0xec, 0x11];
  for (let i = 0; data.length < config.dataCodewords; i += 1) {
    data.push(padBytes[i & 1]);
  }

  const blocks: number[][] = [];
  let offset = 0;
  for (const length of config.blockDataCodewords) {
    blocks.push(data.slice(offset, offset + length));
    offset += length;
  }

  const divisor = reedSolomonDivisor(config.ecCodewordsPerBlock);
  const eccBlocks = blocks.map((block) => reedSolomonRemainder(block, divisor));
  const result: number[] = [];
  const maxDataLength = Math.max(...config.blockDataCodewords);

  for (let i = 0; i < maxDataLength; i += 1) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  for (let i = 0; i < config.ecCodewordsPerBlock; i += 1) {
    for (const block of eccBlocks) result.push(block[i]);
  }
  return result;
}

function formatBits(mask: number) {
  const data = (1 << 3) | mask; // Error-correction level L = binary 01.
  let remainder = data;
  for (let i = 0; i < 10; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

function versionBits(version: number) {
  let remainder = version;
  for (let i = 0; i < 12; i += 1) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  }
  return (version << 12) | remainder;
}

function buildMatrix(value: string) {
  const byteLength = new TextEncoder().encode(value).length;
  const config = chooseVersion(byteLength);
  const { size } = config;
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const functionModules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));

  const setFunction = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = dark;
    functionModules[y][x] = true;
  };

  // Timing patterns are drawn first; finder/alignment patterns replace the
  // portions where the QR specification requires an overlap.
  for (let i = 0; i < size; i += 1) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }

  const drawFinder = (centerX: number, centerY: number) => {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(centerX + dx, centerY + dy, distance !== 2 && distance !== 4);
      }
    }
  };
  drawFinder(3, 3);
  drawFinder(size - 4, 3);
  drawFinder(3, size - 4);

  const lastAlignment = config.alignment.length - 1;
  for (let yIndex = 0; yIndex < config.alignment.length; yIndex += 1) {
    for (let xIndex = 0; xIndex < config.alignment.length; xIndex += 1) {
      if (
        (xIndex === 0 && yIndex === 0) ||
        (xIndex === lastAlignment && yIndex === 0) ||
        (xIndex === 0 && yIndex === lastAlignment)
      ) {
        continue;
      }
      const centerX = config.alignment[xIndex];
      const centerY = config.alignment[yIndex];
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const distance = Math.max(Math.abs(dx), Math.abs(dy));
          setFunction(centerX + dx, centerY + dy, distance !== 1);
        }
      }
    }
  }

  if (config.version >= 7) {
    const bits = versionBits(config.version);
    for (let i = 0; i < 18; i += 1) {
      const dark = ((bits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, dark);
      setFunction(b, a, dark);
    }
  }

  const mask = 0;
  const fmt = formatBits(mask);
  for (let i = 0; i <= 5; i += 1) setFunction(8, i, ((fmt >>> i) & 1) !== 0);
  setFunction(8, 7, ((fmt >>> 6) & 1) !== 0);
  setFunction(8, 8, ((fmt >>> 7) & 1) !== 0);
  setFunction(7, 8, ((fmt >>> 8) & 1) !== 0);
  for (let i = 9; i < 15; i += 1) setFunction(14 - i, 8, ((fmt >>> i) & 1) !== 0);
  for (let i = 0; i < 8; i += 1) setFunction(size - 1 - i, 8, ((fmt >>> i) & 1) !== 0);
  for (let i = 8; i < 15; i += 1) setFunction(8, size - 15 + i, ((fmt >>> i) & 1) !== 0);
  setFunction(8, size - 8, true); // Fixed dark module.

  const codewords = makeCodewords(value, config);
  const dataBits: number[] = [];
  for (const byte of codewords) appendBits(dataBits, byte, 8);

  let bitIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (functionModules[y][x]) continue;
        modules[y][x] = bitIndex < dataBits.length ? dataBits[bitIndex] !== 0 : false;
        bitIndex += 1;
      }
    }
  }

  // Mask pattern 0. A fixed mask keeps this tiny local encoder deterministic;
  // it remains a fully valid QR symbol and avoids sending the TOTP secret to
  // any third-party QR service.
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!functionModules[y][x] && (x + y) % 2 === 0) modules[y][x] = !modules[y][x];
    }
  }

  return modules;
}

export default function LocalQrCode({ value, label = "Authenticator setup QR code" }: { value: string; label?: string }) {
  let modules: boolean[][];
  try {
    modules = buildMatrix(value);
  } catch {
    return null;
  }

  const quietZone = 4;
  const size = modules.length;
  const viewSize = size + quietZone * 2;
  let path = "";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (modules[y][x]) path += `M${x + quietZone},${y + quietZone}h1v1h-1z`;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      role="img"
      aria-label={label}
      className="h-auto w-full max-w-[240px] rounded-2xl bg-white p-2 shadow-sm"
      shapeRendering="crispEdges"
    >
      <rect width={viewSize} height={viewSize} fill="white" />
      <path d={path} fill="black" />
    </svg>
  );
}
