import { useScans } from '@/use-scans';
import { ScanForm } from './scan-form';
import { ScanList } from './scan-list';

export function App() {
  const { scans, addScan, loading } = useScans();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight mb-4">
            Security Scanner
          </h1>
          <ScanForm onSubmit={addScan} loading={loading} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <ScanList scans={scans} />
      </main>
    </div>
  );
}

export default App;
