import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

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
  const [jsonInput, setJsonInput] = useState<string>("");

  const runTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-auth-test", {
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

  const runTestWithJson = async () => {
    if (!jsonInput.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-auth-test", {
        body: { action: "test", googleCredentials: jsonInput.trim() },
      });
      if (error) throw error as any;
      setResult(data as TestResult);
    } catch (e: any) {
      setResult({ success: false, message: "Erro ao chamar função", error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const runRealTest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dental-analysis-v2", {
        body: { action: "test", testCredentials: jsonInput.trim() || undefined },
      });
      if (error) throw error as any;
      setResult(data as TestResult);
    } catch (e: any) {
      setResult({ success: false, message: "Erro ao chamar função de teste", error: e.message });
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
          <div className="flex gap-3 flex-wrap">
            <Button onClick={runTest} disabled={loading} className="shrink-0">
              {loading ? "Testando..." : "Retestar (Secrets)"}
            </Button>
            <Button variant="secondary" onClick={runRealTest} disabled={loading} className="shrink-0">
              {loading ? "Testando..." : "🚀 Teste Completo"}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("https://supabase.com/dashboard/project/blwnzwkkykaobmclsvxg/functions/google-auth-test/logs", "_blank")}
              className="shrink-0"
            >
              Abrir logs da função
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Testar com JSON da Service Account (diagnóstico opcional)</label>
            <Textarea
              placeholder="Cole aqui o JSON completo da Service Account para testar sem depender dos secrets"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="min-h-[140px]"
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={runTestWithJson} disabled={loading || !jsonInput.trim()}>
                {loading ? "Testando..." : "Testar com JSON"}
              </Button>
              <Button variant="ghost" onClick={() => setJsonInput("")}>Limpar</Button>
            </div>
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

