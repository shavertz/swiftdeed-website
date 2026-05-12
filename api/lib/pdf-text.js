import zlib from 'zlib';

function decodePdfString(value = '') {
  return value
    .replace(/\\\)/g, ')')
    .replace(/\\\(/g, '(')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\(.)/g, '$1');
}

function ascii85Decode(input = '') {
  const source = input.replace(/<~/g, '').replace(/~>/g, '').replace(/\s/g, '');
  const bytes = [];
  let group = [];
  for (const ch of source) {
    if (ch === 'z' && group.length === 0) {
      bytes.push(0, 0, 0, 0);
      continue;
    }
    const code = ch.charCodeAt(0);
    if (code < 33 || code > 117) continue;
    group.push(code - 33);
    if (group.length === 5) {
      let value = 0;
      for (const digit of group) value = value * 85 + digit;
      bytes.push((value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255);
      group = [];
    }
  }
  if (group.length) {
    const missing = 5 - group.length;
    while (group.length < 5) group.push(84);
    let value = 0;
    for (const digit of group) value = value * 85 + digit;
    const chunk = [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
    bytes.push(...chunk.slice(0, 4 - missing));
  }
  return Buffer.from(bytes);
}

export function extractReportLabTextFromPdfBuffer(buffer) {
  const pdf = Buffer.from(buffer).toString('latin1');
  const pieces = [];
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match;
  while ((match = streamRegex.exec(pdf))) {
    let stream = Buffer.from(match[1], 'latin1');
    try {
      if (stream[0] !== 0x78) stream = ascii85Decode(stream.toString('latin1'));
      const decoded = zlib.inflateSync(stream).toString('latin1');
      const textRuns = decoded.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj|\[(.*?)\]\s*TJ/gs);
      for (const run of textRuns) {
        const source = run[0];
        const strings = [...source.matchAll(/\((?:\\.|[^\\)])*\)/g)].map(s => decodePdfString(s[0].slice(1, -1)));
        if (strings.length) pieces.push(strings.join(''));
      }
    } catch {}
  }
  return pieces.join('\n').replace(/\u0097/g, '-');
}

function first(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/\s+/g, ' ');
  }
  return null;
}

function cleanMoney(value) {
  return value ? value.replace(/[$,]/g, '') : null;
}

export function deriveLoanFieldsFromText(text = '') {
  const normalized = text.replace(/\r/g, '\n');
  const afterLabel = label => first(normalized, [new RegExp(`${label}:\\s*\\n\\s*([^\\n]+)`, 'i'), new RegExp(`${label}:\\s*([^\\n]+)`, 'i')]);
  const loanAmount = afterLabel('Loan Amount') || first(normalized, [/principal amount of[\s\S]{0,160}?\(\$?([\d,]+(?:\.\d{2})?)\)/i]);
  const property = first(normalized, [
    /Collateral:\s*\n\s*([^\n]+)/i,
    /Property Address:\s*\n\s*([^\n]+)/i,
    /property located at\s+([^.\n(]+)/i,
  ]);

  return {
    unpaid_principal: cleanMoney(loanAmount),
    interest_rate: first(normalized, [/Interest Rate:\s*\n\s*([\d.]+)\s*%/i, /at the rate of\s+([\d.]+)\s*%/i]),
    loan_type: afterLabel('Loan Type'),
    loan_origination_date: first(normalized, [/Close Date:\s*\n\s*([A-Za-z]+ \d{1,2}, \d{4})/i, /Loan No\.[^\n]*\n\s*([A-Za-z]+ \d{1,2}, \d{4})/i, /made as of\s+([A-Za-z]+ \d{1,2}, \d{4})/i]),
    maturity_date: first(normalized, [/Maturity Date:\s*\n\s*([A-Za-z]+ \d{1,2}, \d{4})/i]),
    next_payment_due_date: first(normalized, [/First Payment Date:\s*\n\s*([A-Za-z]+ \d{1,2}, \d{4})/i, /First Payment:\s*\n\s*([A-Za-z]+ \d{1,2}, \d{4})/i]),
    guarantor_name: first(normalized, [/Guarantor\(s\):\s*\n\s*([^\n]+)/i, /guaranteed by\s+([A-Z][A-Za-z .'-]+)(?:\s+\(|\.)/i]),
    property_address: property,
  };
}

export function mergeMissingFields(primary = {}, fallback = {}) {
  const merged = { ...primary };
  for (const [key, value] of Object.entries(fallback)) {
    if ((merged[key] === null || merged[key] === undefined || merged[key] === '') && value) merged[key] = value;
  }
  return merged;
}
