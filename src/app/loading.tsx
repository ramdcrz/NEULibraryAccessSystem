import { LoaderCircle } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
