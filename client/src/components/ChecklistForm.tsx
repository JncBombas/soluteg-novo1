import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Minus, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Tipos para a estrutura do formulário
interface ConditionalRule {
  field: string;
  operator: "eq" | "neq" | "gte" | "lte" | "gt" | "lt";
  value: string | number;
}

interface FormField {
  id: string;
  label: string;
  type: "ok_nok_na" | "text" | "number" | "select" | "textarea" | "checkbox_table";
  options?: string[];
  items?: string[];
  unit?: string;
  required?: boolean;
  conditional?: ConditionalRule;
}

interface FormItem {
  id: string;
  label: string;
  type: "ok_nok_na";
  required?: boolean;
}

interface FormSection {
  id: string;
  title: string;
  items?: FormItem[];
  fields?: FormField[];
}

interface FormStructure {
  sections: FormSection[];
}

interface ChecklistFormProps {
  formStructure: FormStructure;
  initialResponses?: Record<string, unknown>;
  onSave: (responses: Record<string, unknown>, isComplete: boolean) => void;
  isSaving?: boolean;
  readOnly?: boolean;
}

// Componente para botões Ok/NOk/N/A
function OkNokNaButtons({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="sm"
        variant={value === "ok" ? "default" : "outline"}
        className={cn(
          "h-8 w-12",
          value === "ok" && "bg-green-600 hover:bg-green-700"
        )}
        onClick={() => onChange("ok")}
        disabled={disabled}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "nok" ? "default" : "outline"}
        className={cn(
          "h-8 w-12",
          value === "nok" && "bg-red-600 hover:bg-red-700"
        )}
        onClick={() => onChange("nok")}
        disabled={disabled}
      >
        <X className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === "na" ? "default" : "outline"}
        className={cn(
          "h-8 w-12",
          value === "na" && "bg-gray-500 hover:bg-gray-600"
        )}
        onClick={() => onChange("na")}
        disabled={disabled}
      >
        <Minus className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Verifica se um campo deve ser exibido baseado na condição
function shouldShowField(
  field: FormField,
  responses: Record<string, unknown>
): boolean {
  if (!field.conditional) return true;

  const { field: condField, operator, value } = field.conditional;
  const currentValue = responses[condField];

  if (currentValue === undefined || currentValue === null) return false;

  const numCurrent =
    typeof currentValue === "string" ? parseInt(currentValue) : Number(currentValue);
  const numValue = typeof value === "string" ? parseInt(value) : Number(value);

  switch (operator) {
    case "eq":
      return currentValue === value || numCurrent === numValue;
    case "neq":
      return currentValue !== value && numCurrent !== numValue;
    case "gte":
      return !isNaN(numCurrent) && !isNaN(numValue) && numCurrent >= numValue;
    case "lte":
      return !isNaN(numCurrent) && !isNaN(numValue) && numCurrent <= numValue;
    case "gt":
      return !isNaN(numCurrent) && !isNaN(numValue) && numCurrent > numValue;
    case "lt":
      return !isNaN(numCurrent) && !isNaN(numValue) && numCurrent < numValue;
    default:
      return true;
  }
}

// Verifica se todos os campos obrigatórios estão preenchidos
function checkCompletion(
  formStructure: FormStructure,
  responses: Record<string, unknown>
): boolean {
  for (const section of formStructure.sections) {
    // Verificar items (Ok/NOk/N/A)
    if (section.items) {
      for (const item of section.items) {
        if (item.required !== false) {
          const value = responses[item.id];
          if (!value || (value !== "ok" && value !== "nok" && value !== "na")) {
            return false;
          }
        }
      }
    }

    // Verificar fields
    if (section.fields) {
      for (const field of section.fields) {
        // Pular campos condicionais que não devem ser exibidos
        if (!shouldShowField(field, responses)) continue;

        if (field.required) {
          const value = responses[field.id];
          if (value === undefined || value === null || value === "") {
            return false;
          }
        }
      }
    }
  }

  return true;
}

export default function ChecklistForm({
  formStructure,
  initialResponses = {},
  onSave,
  isSaving = false,
  readOnly = false,
}: ChecklistFormProps) {
  const [responses, setResponses] = useState<Record<string, unknown>>(
    initialResponses
  );

  // Parse formStructure se for string JSON
  let parsedFormStructure: FormStructure | null = formStructure as any;
  if (typeof formStructure === 'string') {
    try {
      parsedFormStructure = JSON.parse(formStructure);
    } catch (e) {
      console.error('Erro ao fazer parse de formStructure:', e);
      parsedFormStructure = null;
    }
  }// Atualizar responses quando initialResponses mudar
  useEffect(() => {
    setResponses(initialResponses);
  }, [initialResponses]);

  // Temporariamente sempre marcar como completo
  const isComplete = true;

  const handleChange = (fieldId: string, value: unknown) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSave = () => {
    onSave(responses, isComplete);
  };

  const renderField = (field: FormField) => {
    // Verificar condição
    if (!shouldShowField(field, responses)) return null;

    const value = responses[field.id];

    switch (field.type) {
      case "ok_nok_na":
        return (
          <div
            key={field.id}
            className="flex items-center justify-between py-2 border-b border-border/50"
          >
            <Label className="text-sm">{field.label}</Label>
            <OkNokNaButtons
              value={value as string}
              onChange={(val) => handleChange(field.id, val)}
              disabled={readOnly}
            />
          </div>
        );

      case "text":
        return (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-sm">
              {field.label}
              {field.unit && (
                <span className="text-muted-foreground ml-1">({field.unit})</span>
              )}
            </Label>
            <Input
              value={(value as string) || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              disabled={readOnly}
              placeholder={`Digite ${field.label.toLowerCase()}`}
            />
          </div>
        );

      case "number":
        return (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-sm">
              {field.label}
              {field.unit && (
                <span className="text-muted-foreground ml-1">({field.unit})</span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={(value as string) || ""}
                onChange={(e) => handleChange(field.id, e.target.value)}
                disabled={readOnly}
                placeholder="0"
                className="flex-1"
              />
              {field.unit && (
                <span className="text-sm text-muted-foreground w-8">
                  {field.unit}
                </span>
              )}
            </div>
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-sm">{field.label}</Label>
            <Select
              value={(value as string) || ""}
              onValueChange={(val) => handleChange(field.id, val)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-sm">{field.label}</Label>
            <Textarea
              value={(value as string) || ""}
              onChange={(e) => handleChange(field.id, e.target.value)}
              disabled={readOnly}
              placeholder={`Digite ${field.label.toLowerCase()}`}
              rows={3}
            />
          </div>
        );

      case "checkbox_table":
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-sm font-medium">{field.label}</Label>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-3 py-2 text-left font-medium">Item</th>
                    {field.options?.map((option) => (
                      <th key={option} className="px-3 py-2 text-center font-medium">
                        {option}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {field.items?.map((item, idx) => (
                    <tr key={item} className="border-b last:border-0">
                      <td className="px-3 py-2">{item}</td>
                      {field.options?.map((option) => {
                        const itemKey = `${field.id}_${item}_${option}`;
                        const isChecked = responses[itemKey] === true;
                        return (
                          <td key={option} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleChange(itemKey, e.target.checked)}
                              disabled={readOnly}
                              className="h-4 w-4 cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Validar formStructure
  if (!parsedFormStructure || !parsedFormStructure.sections || !Array.isArray(parsedFormStructure.sections)) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Nenhuma estrutura de formulário disponível
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {parsedFormStructure.sections.map((section) => (
        <Card key={section.id}>
          <CardHeader className="py-3 px-4 bg-muted/30">
            <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {/* Renderizar items (Ok/NOk/N/A) */}
            {section.items?.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <Label className="text-sm">{item.label}</Label>
                <OkNokNaButtons
                  value={responses[item.id] as string}
                  onChange={(val) => handleChange(item.id, val)}
                  disabled={readOnly}
                />
              </div>
            ))}

            {/* Renderizar fields */}
            {section.fields?.map((field) => renderField(field))}
          </CardContent>
        </Card>
      ))}

      {/* Botão de salvar */}
      {!readOnly && (
        <div className="flex items-center justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Respostas
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
