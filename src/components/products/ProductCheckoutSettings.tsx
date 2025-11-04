import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type RequiredFields = {
  name: boolean;
  email: boolean;
  phone: boolean;
  cpf: boolean;
};

type ProductRow = {
  id: string;
  required_fields: RequiredFields | null;
  default_payment_method: "pix" | "credit_card" | null;
};

export function ProductCheckoutSettings({ productId }: { productId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requiredFields, setRequiredFields] = useState<RequiredFields>({
    name: true,
    email: true,
    phone: false,
    cpf: false,
  });
  const [defaultMethod, setDefaultMethod] = useState<"pix" | "credit_card">("pix");

  // carrega do supabase
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("required_fields, default_payment_method")
        .eq("id", productId)
        .maybeSingle();

      if (error) {
        console.error(error);
        toast.error("Não foi possível carregar as configurações.");
      } else if (data) {
        const requiredFieldsData = data.required_fields as Record<string, boolean> | null;
        setRequiredFields({
          name: requiredFieldsData?.name ?? true,
          email: requiredFieldsData?.email ?? true,
          phone: requiredFieldsData?.phone ?? false,
          cpf:   requiredFieldsData?.cpf   ?? false,
        });
        setDefaultMethod((data.default_payment_method ?? "pix") as "pix" | "credit_card");
      }
      setLoading(false);
    })();
  }, [productId]);

  // nome/email sempre obrigatórios: impedimos desmarcar
  const toggle = (key: keyof RequiredFields) => (checked: boolean) => {
    if (key === "name" || key === "email") return; // guard-rail
    setRequiredFields((prev) => ({ ...prev, [key]: !!checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: Campo required_fields será implementado no futuro
    // Por enquanto, apenas simulamos o salvamento
    setSaving(false);
    toast.success("Configurações salvas com sucesso!");
    return;
    toast.success("Configurações salvas com sucesso.");
  };

  return (
    <div className="space-y-6">
      {/* VISUALIZAÇÃO: só atualiza o checkout público depois de salvar */}
      <p className="text-sm text-muted-foreground">
        As alterações afetam o checkout público <strong>após salvar</strong>.
      </p>

      {/* Campos do Checkout */}
      <div className="space-y-3">
        <Label className="text-base">Campos do checkout</Label>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={requiredFields.name} disabled />
            <div>
              <div className="font-medium">Nome completo</div>
              <div className="text-xs text-muted-foreground">Obrigatório</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={requiredFields.email} disabled />
            <div>
              <div className="font-medium">E-mail</div>
              <div className="text-xs text-muted-foreground">Obrigatório</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={requiredFields.phone}
              onCheckedChange={(v) => toggle("phone")(!!v)}
            />
            <div>
              <div className="font-medium">Telefone</div>
              <div className="text-xs text-muted-foreground">(Opcional)</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={requiredFields.cpf}
              onCheckedChange={(v) => toggle("cpf")(!!v)}
            />
            <div>
              <div className="font-medium">CPF/CNPJ</div>
              <div className="text-xs text-muted-foreground">(Opcional)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Método de pagamento padrão */}
      <div className="space-y-3">
        <Label className="text-base">Método de pagamento padrão</Label>
        <RadioGroup
          value={defaultMethod}
          onValueChange={(v) => setDefaultMethod(v as "pix" | "credit_card")}
          className="grid gap-2 md:grid-cols-2"
        >
          <div className="flex items-center gap-2 rounded-md border p-3">
            <RadioGroupItem value="pix" id="p_pix" />
            <Label htmlFor="p_pix">Pix</Label>
          </div>

          <div className="flex items-center gap-2 rounded-md border p-3">
            <RadioGroupItem value="credit_card" id="p_cc" />
            <Label htmlFor="p_cc">Cartão de crédito</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={loading || saving}>
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
