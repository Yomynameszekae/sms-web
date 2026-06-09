'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isAxiosError } from 'axios';

function extractMessage(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.message ?? error.message ?? 'Something went wrong.';
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
}

interface UseApiMutationOptions<TData, TVariables> extends
  Omit<UseMutationOptions<TData, unknown, TVariables>, 'onSuccess' | 'onError'> {
  successMessage?: string | ((data: TData) => string);
  invalidateKeys?: ReadonlyArray<ReadonlyArray<unknown>>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: unknown) => void;
}

export function useApiMutation<TData, TVariables>(
  options: UseApiMutationOptions<TData, TVariables>,
) {
  const queryClient = useQueryClient();
  const { successMessage, invalidateKeys, onSuccess, onError, ...rest } = options;

  return useMutation<TData, unknown, TVariables>({
    ...rest,
    onSuccess: (data, variables) => {
      if (successMessage) {
        const msg = typeof successMessage === 'function' ? successMessage(data) : successMessage;
        toast.success(msg);
      }
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      }
      onSuccess?.(data, variables);
    },
    onError: (error) => {
      toast.error(extractMessage(error));
      onError?.(error);
    },
  });
}
