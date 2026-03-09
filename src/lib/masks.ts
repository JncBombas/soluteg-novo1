/**
 * Funções de máscara e validação para CNPJ/CPF e Telefone
 */

/**
 * Aplica máscara de CNPJ ou CPF automaticamente
 * CNPJ: 00.000.000/0000-00
 * CPF: 000.000.000-00
 */
export function maskCnpjCpf(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");

  // Se tem mais de 11 dígitos, é CNPJ
  if (numbers.length > 11) {
    return numbers
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  // Caso contrário, é CPF
  return numbers
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1-$2");
}

/**
 * Aplica máscara de telefone
 * Formato: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function maskPhone(value: string): string {
  const numbers = value.replace(/\D/g, "");

  if (numbers.length <= 10) {
    return numbers
      .slice(0, 10)
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return numbers
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

/**
 * Valida CNPJ
 * Algoritmo oficial de validação de CNPJ
 */
export function isValidCnpj(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, "");

  // Deve ter exatamente 14 dígitos
  if (numbers.length !== 14) return false;

  // Não pode ser uma sequência repetida
  if (/^(\d)\1{13}$/.test(numbers)) return false;

  // Calcula primeiro dígito verificador
  let sum = 0;
  let multiplier = 5;

  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }

  let remainder = sum % 11;
  let firstDigit = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(numbers[12]) !== firstDigit) return false;

  // Calcula segundo dígito verificador
  sum = 0;
  multiplier = 6;

  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }

  remainder = sum % 11;
  let secondDigit = remainder < 2 ? 0 : 11 - remainder;

  return parseInt(numbers[13]) === secondDigit;
}

/**
 * Valida CPF
 * Algoritmo oficial de validação de CPF
 */
export function isValidCpf(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, "");

  // Deve ter exatamente 11 dígitos
  if (numbers.length !== 11) return false;

  // Não pode ser uma sequência repetida
  if (/^(\d)\1{10}$/.test(numbers)) return false;

  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }

  let remainder = sum % 11;
  let firstDigit = remainder < 2 ? 0 : 11 - remainder;

  if (parseInt(numbers[9]) !== firstDigit) return false;

  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }

  remainder = sum % 11;
  let secondDigit = remainder < 2 ? 0 : 11 - remainder;

  return parseInt(numbers[10]) === secondDigit;
}

/**
 * Valida CNPJ ou CPF
 */
export function isValidCnpjCpf(value: string): boolean {
  const numbers = value.replace(/\D/g, "");

  if (numbers.length === 14) {
    return isValidCnpj(value);
  }

  if (numbers.length === 11) {
    return isValidCpf(value);
  }

  return false;
}

/**
 * Valida telefone brasileiro
 * Aceita formatos: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 */
export function isValidPhone(phone: string): boolean {
  const numbers = phone.replace(/\D/g, "");

  // Deve ter 10 ou 11 dígitos
  if (numbers.length !== 10 && numbers.length !== 11) return false;

  // DDD deve estar entre 11 e 99
  const ddd = parseInt(numbers.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;

  return true;
}
