'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { seedFirestoreData } from '@/lib/seed-firestore';
import { Database, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type SeedResult = {
  collection: string;
  total: number;
  seeded: number;
  skipped: number;
};

export default function AdminSetupPage() {
  const [results, setResults] = useState<SeedResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await seedFirestoreData();
      setResults(res);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Seeding failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['MASTER_ADMIN']}>
      <div className="space-y-6">
        <PageHeader
          title="Admin Setup"
          description="One-time Firestore data seeding. Run once to migrate static data to Firestore."
        />

        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Seed Firestore Collections
            </CardTitle>
            <CardDescription>
              Seeds clients, chambers, and vendors from static data into Firestore.
              Safe to run multiple times — existing documents are skipped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-4 bg-muted/30 text-sm space-y-1">
              <p className="font-semibold">Collections to seed:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>clients (2 records)</li>
                <li>chambers (1 record)</li>
                <li>vendors (3 records)</li>
              </ul>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm p-3 border border-destructive/30 rounded-md bg-destructive/5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((r) => (
                  <div
                    key={r.collection}
                    className="flex items-center justify-between p-3 border rounded-md bg-background"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium capitalize">{r.collection}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {r.seeded} seeded
                      </Badge>
                      {r.skipped > 0 && (
                        <Badge variant="outline">{r.skipped} skipped</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleSeed} disabled={loading || done} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Seeding...
                </>
              ) : done ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Seeding Complete
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Run Seed
                </>
              )}
            </Button>

            {done && (
              <p className="text-xs text-muted-foreground text-center">
                Seeding complete. This page can be removed after migration is verified.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
