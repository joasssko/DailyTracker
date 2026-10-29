import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useToast } from './toast';

/** Mutación genérica que invalida todo el caché al terminar y muestra errores como toast. */
export function useApiMutation<TVars, TRes = unknown>(
  fn: (vars: TVars) => Promise<TRes>,
  opts: { success?: string | ((res: TRes) => string | undefined); onSuccess?: (res: TRes) => void } = {},
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: (res) => {
      qc.invalidateQueries();
      const msg = typeof opts.success === 'function' ? opts.success(res) : opts.success;
      if (msg) toast(msg);
      opts.onSuccess?.(res);
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });
}

export { api };
