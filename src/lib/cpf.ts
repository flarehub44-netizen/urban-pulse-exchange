export function normalizeCpfDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeCpfDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calcCheckDigit = (base: string, factorStart: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += Number(base[i]) * (factorStart - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const d1 = calcCheckDigit(digits.slice(0, 9), 10);
  const d2 = calcCheckDigit(digits.slice(0, 10), 11);
  return d1 === Number(digits[9]) && d2 === Number(digits[10]);
}

export function hasValidProfileCpf(cpf: string | null | undefined): boolean {
  return normalizeCpfDigits(cpf ?? "").length === 11;
}
