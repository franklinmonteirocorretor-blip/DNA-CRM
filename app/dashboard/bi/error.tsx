'use client'

import ErrorState from '@/src/components/ui/ErrorState'

export default function BIError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorState error={error} reset={reset} />
}