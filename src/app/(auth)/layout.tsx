export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-orange-500">Menuiro</h1>
        <p className="text-sm text-zinc-500 mt-1">Menu digital untuk bisnis F&amp;B</p>
      </div>
      {children}
    </div>
  );
}
