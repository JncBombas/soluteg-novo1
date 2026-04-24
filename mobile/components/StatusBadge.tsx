// ============================================================
// Componente reutilizável de badge de status de OS.
// Usado na lista e no detalhe das ordens de serviço.
// ============================================================
import { View, Text } from "react-native";
import { WO_STATUS_COLOR, WO_STATUS_LABEL } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const color = WO_STATUS_COLOR[status] ?? "#6b7280";
  const label = WO_STATUS_LABEL[status] ?? status;

  return (
    <View
      className={`rounded-full items-center justify-center ${
        size === "md" ? "px-3 py-1" : "px-2.5 py-0.5"
      }`}
      style={{ backgroundColor: `${color}22` }}
    >
      <Text
        className={`font-semibold ${size === "md" ? "text-sm" : "text-xs"}`}
        style={{ color }}
      >
        {label}
      </Text>
    </View>
  );
}
