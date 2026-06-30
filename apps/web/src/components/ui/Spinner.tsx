export function Spinner() {
  return (
    <div
      role="status"
      aria-label="Chargement"
      className="mx-auto h-8 w-8 rounded-full border-4 border-indigo-300 border-t-indigo-600 animate-spin"
    />
  );
}
