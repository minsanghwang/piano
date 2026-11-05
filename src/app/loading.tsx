export default function Loading() {
  return (
    <div className="mx-auto max-w-xl p-6" role="status" aria-busy="true">
      <p className="mb-4 animate-pulse text-gray-500">불러오는 중...</p>
      <div className="space-y-3">
        <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="h-16 animate-pulse rounded bg-gray-100" />
        <div className="h-16 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}
