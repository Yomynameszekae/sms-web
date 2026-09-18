'use client';

import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiErrorMessage } from '@/lib/api/errors';

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
      // apiErrorMessage unpacks the backend's `errors` array, so field-level
      // validation messages reach the user instead of "Validation failed".
      toast.error(apiErrorMessage(error));
      onError?.(error);
    },
  });
}
