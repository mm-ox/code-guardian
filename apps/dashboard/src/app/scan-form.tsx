import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/;

interface ScanFormProps {
  onSubmit: (repositoryUrl: string) => void;
  loading: boolean;
}

export function ScanForm({ onSubmit, loading }: ScanFormProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = url.trim();
    if (!GITHUB_URL_PATTERN.test(trimmed)) {
      setError('Enter a valid GitHub repository URL');
      return;
    }

    setError(null);
    onSubmit(trimmed);
    setUrl('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-3">
      <div className="flex-1">
        <Input
          type="url"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          className="h-10"
        />
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      </div>
      <Button type="submit" disabled={loading} className="h-10">
        {loading ? 'Starting…' : 'Start Scan'}
      </Button>
    </form>
  );
}
