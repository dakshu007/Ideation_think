export default function Alert({ error, success }: { error?: string; success?: string }) {
  if (error) return <p className="alert error" role="alert">{error}</p>;
  if (success) return <p className="alert success" role="status">{success}</p>;
  return null;
}
