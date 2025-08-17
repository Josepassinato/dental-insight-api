import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TestResult {
  success: boolean;
  message: string;
  status?: string;
  project_id?: string;
  client_email?: string;
  token_expires_in?: number;
  project_name?: string;
  google_status?: number;
  google_error?: string;
  error?: string;
}

const Diagnostics = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-google-credentials", {
        body: { action: "test" },
      });
      if (error) throw error as any;
      setResult(data as TestResult);
    } catch (e: any) {
      setResult({ success: false, message: "Erro ao chamar função", error: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Diagnóstico Google Cloud | Dental Insight";
    runTest();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Diagnóstico Google Cloud
            {result?.status === "connected" ? (
              <Badge variant="default">Conectado</Badge>
            ) : result ? (
              <Badge variant="destructive">Desconectado</Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={runTest} disabled={loading} className="shrink-0">
              {loading ? "Testando..." : "Retestar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("https://supabase.com/dashboard/project/blwnzwkkykaobmclsvxg/functions/update-google-credentials/logs", "_blank")}
              className="shrink-0"
            >
              Abrir logs da função
            </Button>
          </div>

          <pre className="text-sm rounded-md p-4 bg-muted overflow-auto max-h-[60vh]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </main>
  );
};

export default Diagnostics;
