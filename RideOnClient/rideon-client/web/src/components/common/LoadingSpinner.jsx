export default function LoadingSpinner({ text = "LOADING" }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        <p className="text-sm font-medium text-gray-600">{text}</p>
      </div>
    </div>
  );
}