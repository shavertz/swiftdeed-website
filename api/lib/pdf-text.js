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

export function extractReportLabTextFromPdfBuffer(buffer) {
  const pdf = Buffer.from(buffer).toString('latin1');
  const pieces = [];
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  while ((match = streamRegex.exec(pdf))) {
    let stream = Buffer.from(match[1], 'latin1');
    try {
      if (stream[0] === 0x47 && stream[1] === 0x61) stream = Buffer.from(stream.toString('latin1').replace(/\s+$/g, '~>'), 'ascii');
      if (stream.includes(0x7e)) stream = Buffer.from(stream.toString('ascii').replace(/\s/g, ''), 'ascii');
      const decoded = zlib.inflateSync(stream[0] === 0x47 ? Buffer.from(stream.toString('ascii'), 'ascii') : stream).toString('latin1');
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
  const property = first(normalized, [
    /Collateral\s*\n?\s*([^\n]+)/i,
    /Property Address\s*\n?\s*([^\n]+)/i,
    /property located at\s+([^.\n(]+)/i,
  ]);

  return {
    unpaid_principal: cleanMoney(first(normalized, [/Loan Amount\s*\n?\s*(\$?[\d,]+(?:\.\d{2})?)/i, /principal amount of\s+([A-Za-z -]+(?:\s+and\s+)?[\w -]+ Dollars?)\s*\(\$?([\d,]+(?:\.\d{2})?)\)/i])) || first(normalized, [/principal amount of[\s\S]{0,120}?\(\$?([\d,]+(?:\.\d{2})?)\)/i]),
    interest_rate: first(normalized, [/Interest Rate\s*\n?\s*([\d.]+)\s*%/i, /at the rate of\s+([\d.]+)\s*%/i]),
    loan_type: first(normalized, [/Loan Type\s*\n?\s*([^\n]+)/i]),
    loan_origination_date: first(normalized, [/Close Date\s*\n?\s*([A-Za-z]+ \d{1,2}, \d{4})/i, /Loan No\.[^\n]*\n\s*([A-Za-z]+ \d{1,2}, \d{4})/i, /made as of\s+([A-Za-z]+ \d{1,2}, \d{4})/i]),
    maturity_date: first(normalized, [/Maturity Date\s*\n?\s*([A-Za-z]+ \d{1,2}, \d{4})/i]),
    next_payment_due_date: first(normalized, [/First Payment Date\s*\n?\s*([A-Za-z]+ \d{1,2}, \d{4})/i, /First Payment\s*\n?\s*([A-Za-z]+ \d{1,2}, \d{4})/i]),
    guarantor_name: first(normalized, [/Guarantor\(s\)\s*\n?\s*([^\n]+)/i, /guaranteed by\s+([A-Z][A-Za-z .'-]+)(?:\s+\(|\.)/i]),
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
