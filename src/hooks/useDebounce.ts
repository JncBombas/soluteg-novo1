import { useEffect, useState } from 'react';

/**
 * Hook para atrasar a atualização de um valor.
 * Muito usado em campos de busca para não sobrecarregar o servidor.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Define um timer para atualizar o valor após o tempo de espera (delay)
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Se o usuário digitar outra letra antes do tempo acabar, cancela o timer anterior
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}