import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

export function AdminPlans() {
  const plans = [
    {
      name: "Basic",
      type: "basic",
      price: "R$ 97/mês",
      features: [
        "50 exames por mês",
        "1 usuário",
        "Análise básica de IA",
        "Relatórios padrão",
        "Suporte por email",
      ],
    },
    {
      name: "Professional",
      type: "professional",
      price: "R$ 297/mês",
      features: [
        "200 exames por mês",
        "5 usuários",
        "Análise avançada de IA",
        "Relatórios personalizados",
        "Integrações",
        "Suporte prioritário",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      type: "enterprise",
      price: "Sob consulta",
      features: [
        "Exames ilimitados",
        "Usuários ilimitados",
        "IA customizada",
        "API dedicada",
        "Suporte 24/7",
        "Treinamento incluso",
      ],
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <Card key={plan.type} className={plan.popular ? "border-primary shadow-lg" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{plan.name}</CardTitle>
              {plan.popular && (
                <Badge variant="default">Popular</Badge>
              )}
            </div>
            <CardDescription>
              <div className="text-2xl font-bold mt-2">{plan.price}</div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
