// ============================================================
// Detalhe de uma Ordem de Serviço — Portal do Técnico.
//
// Esta tela permite ao técnico:
// - Ver todas as informações da OS
// - Iniciar, pausar ou finalizar a OS
// - Marcar tarefas como concluídas
// - Adicionar fotos (câmera ou galeria)
// - Adicionar observações/comentários
// - Assinar digitalmente antes de finalizar
// ============================================================
import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  FlatList,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import SignatureCanvas, { SignatureViewRef } from "react-native-signature-canvas";
import { trpc } from "@/lib/trpc";
import { getTechnicianToken } from "@/lib/auth";
import {
  API_URL,
  WO_STATUS_COLOR,
  WO_STATUS_LABEL,
  WO_TYPE_LABEL,
  ACTIVE_STATUSES,
} from "@/lib/constants";

export default function WorkOrderDetailScreen() {
  // Lê o parâmetro ":id" da URL (ex: /technician/work-order/42 → "42")
  const { id } = useLocalSearchParams<{ id: string }>();
  const workOrderId = Number(id);

  // ── Estado local ─────────────────────────────────────────────
  const [commentText, setCommentText]     = useState("");
  const [showSignModal, setShowSignModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addingComment, setAddingComment]  = useState(false);
  const sigRef = useRef<SignatureViewRef>(null);

  // ── Queries tRPC ─────────────────────────────────────────────
  const utils = trpc.useUtils();

  const { data: wo, isLoading } = trpc.technicianPortal.getWorkOrderById.useQuery(
    { id: workOrderId },
    { enabled: !!workOrderId }
  );

  const { data: tasks = [] }    = trpc.technicianPortal.tasks.list.useQuery(
    { workOrderId },
    { enabled: !!workOrderId }
  );

  const { data: comments = [] } = trpc.technicianPortal.comments.list.useQuery(
    { workOrderId },
    { enabled: !!workOrderId }
  );

  const { data: attachments = [] } = trpc.technicianPortal.attachments.list.useQuery(
    { workOrderId },
    { enabled: !!workOrderId }
  );

  // ── Mutations tRPC ───────────────────────────────────────────
  const updateStatus = trpc.technicianPortal.updateStatus.useMutation({
    onSuccess: () => utils.technicianPortal.getWorkOrderById.invalidate({ id: workOrderId }),
    onError: (err) => Alert.alert("Erro", err.message),
  });

  const toggleTask = trpc.technicianPortal.tasks.toggle.useMutation({
    onSuccess: () => utils.technicianPortal.tasks.list.invalidate({ workOrderId }),
  });

  const saveSignature = trpc.technicianPortal.saveSignature.useMutation({
    onSuccess: () => utils.technicianPortal.getWorkOrderById.invalidate({ id: workOrderId }),
    onError: (err) => Alert.alert("Erro ao salvar assinatura", err.message),
  });

  const createComment = trpc.technicianPortal.comments.create.useMutation({
    onSuccess: () => {
      setCommentText("");
      utils.technicianPortal.comments.list.invalidate({ workOrderId });
    },
    onError: (err) => Alert.alert("Erro", err.message),
  });

  const createAttachment = trpc.technicianPortal.attachments.create.useMutation({
    onSuccess: () => utils.technicianPortal.attachments.list.invalidate({ workOrderId }),
    onError: (err) => Alert.alert("Erro", err.message),
  });

  // ── Handlers ─────────────────────────────────────────────────

  function handleStart() {
    Alert.alert("Iniciar OS", "Deseja iniciar esta ordem de serviço?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Iniciar",
        onPress: () =>
          updateStatus.mutate({ id: workOrderId, status: "em_andamento" }),
      },
    ]);
  }

  function handlePause() {
    Alert.alert("Pausar OS", "Deseja pausar esta ordem de serviço?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Pausar",
        onPress: () =>
          updateStatus.mutate({ id: workOrderId, status: "pausada" }),
      },
    ]);
  }

  function handleResume() {
    updateStatus.mutate({ id: workOrderId, status: "em_andamento" });
  }

  // Finalizar exige assinatura — abre o modal antes de mudar o status
  function handleFinish() {
    if (!wo?.technicianSignature) {
      // Técnico ainda não assinou — pede para assinar primeiro
      setShowSignModal(true);
    } else {
      // Já assinou — pode finalizar diretamente
      Alert.alert("Finalizar OS", "Confirmar conclusão desta OS?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () =>
            updateStatus.mutate({ id: workOrderId, status: "concluida" }),
        },
      ]);
    }
  }

  // Chamado quando o técnico confirma a assinatura no canvas
  async function handleSignatureOK(signatureBase64: string) {
    setShowSignModal(false);
    try {
      await saveSignature.mutateAsync({ id: workOrderId, signature: signatureBase64 });
      // Após salvar a assinatura, pergunta se quer finalizar
      Alert.alert("Assinatura salva", "Deseja finalizar a OS agora?", [
        { text: "Não" },
        {
          text: "Finalizar",
          onPress: () =>
            updateStatus.mutate({ id: workOrderId, status: "concluida" }),
        },
      ]);
    } catch {
      // Erro já tratado pela mutation
    }
  }

  // Upload de foto: abre o seletor e envia para o servidor
  async function handleAddPhoto(source: "camera" | "gallery") {
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: "images",
            quality: 0.7,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: "images",
            quality: 0.7,
          });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const token = await getTechnicianToken();

    // Monta o FormData com a imagem escolhida
    const formData = new FormData();
    formData.append("files", {
      uri: asset.uri,
      name: asset.fileName ?? `foto_${Date.now()}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    } as any);

    setUploadingPhoto(true);
    try {
      // Faz upload para o Cloudinary via endpoint REST do servidor
      const res = await fetch(`${API_URL}/api/work-orders/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Não definir Content-Type manualmente — o fetch define o boundary do multipart
        },
        body: formData,
      });
      const data = await res.json();
      if (!data.success || !data.urls?.length) throw new Error("Upload falhou");

      const { url, key, fileName, fileType } = data.urls[0];

      // Registra o anexo na OS via tRPC
      await createAttachment.mutateAsync({
        workOrderId,
        url,
        fileKey: key,
        fileName: fileName ?? "foto.jpg",
        mimeType: fileType ?? "image/jpeg",
        category: "during",
      });
    } catch (err: any) {
      Alert.alert("Erro no upload", err.message ?? "Tente novamente.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function showPhotoOptions() {
    Alert.alert("Adicionar foto", "Escolha a origem", [
      { text: "Câmera",  onPress: () => handleAddPhoto("camera") },
      { text: "Galeria", onPress: () => handleAddPhoto("gallery") },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      await createComment.mutateAsync({ workOrderId, content: commentText.trim() });
    } finally {
      setAddingComment(false);
    }
  }

  // ── Renderização ─────────────────────────────────────────────

  if (isLoading || !wo) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const status      = wo.status as string;
  const isActive    = ACTIVE_STATUSES.includes(status);
  const canStart    = ["aberta", "aprovada", "aguardando_aprovacao"].includes(status);
  const canPause    = status === "em_andamento";
  const canResume   = status === "pausada";
  const canFinish   = status === "em_andamento" || status === "pausada";
  const isFinished  = status === "concluida";

  return (
    <>
      <SafeAreaView className="flex-1 bg-gray-50" edges={["bottom"]}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

          {/* ── Informações da OS ──────────────────────────── */}
          <View className="bg-white rounded-2xl p-4 gap-3">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-sm font-bold text-gray-400">OS #{wo.osNumber}</Text>
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: `${WO_STATUS_COLOR[status] ?? "#6b7280"}22` }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: WO_STATUS_COLOR[status] ?? "#6b7280" }}
                >
                  {WO_STATUS_LABEL[status] ?? status}
                </Text>
              </View>
            </View>

            <Text className="text-xl font-bold text-gray-900">{wo.title}</Text>

            {wo.description ? (
              <Text className="text-sm text-gray-600">{wo.description}</Text>
            ) : null}

            <View className="gap-1.5 pt-1">
              {wo.clientName ? (
                <InfoRow icon="👤" text={wo.clientName} />
              ) : null}
              {wo.address ? (
                <InfoRow icon="📍" text={wo.address} />
              ) : null}
              {wo.scheduledDate ? (
                <InfoRow
                  icon="📅"
                  text={new Date(wo.scheduledDate).toLocaleDateString("pt-BR")}
                />
              ) : null}
              <InfoRow icon="🔖" text={WO_TYPE_LABEL[wo.type as string] ?? wo.type} />
            </View>
          </View>

          {/* ── Botões de ação ─────────────────────────────── */}
          {!isFinished && (
            <View className="flex-row gap-3">
              {canStart && (
                <ActionButton
                  label="▶ Iniciar"
                  color="#2563eb"
                  onPress={handleStart}
                  loading={updateStatus.isPending}
                />
              )}
              {canPause && (
                <ActionButton
                  label="⏸ Pausar"
                  color="#8b5cf6"
                  onPress={handlePause}
                  loading={updateStatus.isPending}
                />
              )}
              {canResume && (
                <ActionButton
                  label="▶ Retomar"
                  color="#2563eb"
                  onPress={handleResume}
                  loading={updateStatus.isPending}
                />
              )}
              {canFinish && (
                <ActionButton
                  label="✓ Finalizar"
                  color="#059669"
                  onPress={handleFinish}
                  loading={updateStatus.isPending || saveSignature.isPending}
                />
              )}
            </View>
          )}

          {isFinished && (
            <View className="bg-green-50 border border-green-200 rounded-2xl p-4 items-center">
              <Text className="text-green-700 font-bold text-base">
                ✓ Ordem de Serviço Concluída
              </Text>
              {wo.technicianSignedAt ? (
                <Text className="text-green-600 text-sm mt-1">
                  Assinada em {new Date(wo.technicianSignedAt).toLocaleDateString("pt-BR")}
                </Text>
              ) : null}
            </View>
          )}

          {/* ── Tarefas (apenas quando OS está ativa) ──────── */}
          {tasks.length > 0 && (
            <SectionCard title="Tarefas">
              {tasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  className="flex-row items-center gap-3 py-2"
                  disabled={!isActive}
                  onPress={() =>
                    toggleTask.mutate({ workOrderId, taskId: task.id })
                  }
                  activeOpacity={isActive ? 0.7 : 1}
                >
                  <View
                    className={`w-5 h-5 rounded border-2 items-center justify-center ${
                      task.completed
                        ? "bg-green-500 border-green-500"
                        : "border-gray-300"
                    }`}
                  >
                    {task.completed && (
                      <Text className="text-white text-xs">✓</Text>
                    )}
                  </View>
                  <Text
                    className={`flex-1 text-sm ${
                      task.completed
                        ? "line-through text-gray-400"
                        : "text-gray-800"
                    }`}
                  >
                    {task.description}
                  </Text>
                </TouchableOpacity>
              ))}
              {!isActive && (
                <Text className="text-xs text-gray-400 mt-2">
                  Inicie a OS para marcar tarefas
                </Text>
              )}
            </SectionCard>
          )}

          {/* ── Fotos ──────────────────────────────────────── */}
          <SectionCard title="Fotos">
            {/* Grade de fotos já anexadas */}
            {attachments.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-3">
                {attachments.map((att) => (
                  <Image
                    key={att.id}
                    source={{ uri: att.url }}
                    className="w-24 h-24 rounded-xl bg-gray-100"
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}

            {isActive && (
              <TouchableOpacity
                className="border-2 border-dashed border-blue-300 rounded-xl py-4 items-center"
                onPress={showPhotoOptions}
                disabled={uploadingPhoto}
                activeOpacity={0.7}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#2563eb" />
                ) : (
                  <>
                    <Text className="text-2xl">📷</Text>
                    <Text className="text-blue-600 text-sm font-medium mt-1">
                      Adicionar foto
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {!isActive && attachments.length === 0 && (
              <Text className="text-gray-400 text-sm text-center py-4">
                Nenhuma foto anexada
              </Text>
            )}
          </SectionCard>

          {/* ── Observações / Comentários ───────────────────── */}
          <SectionCard title="Observações">
            {/* Lista de comentários existentes */}
            {comments.length > 0 ? (
              <View className="gap-3 mb-3">
                {comments.map((c) => (
                  <View key={c.id} className="bg-gray-50 rounded-xl p-3">
                    <Text className="text-sm text-gray-800">{c.content}</Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      {new Date(c.createdAt).toLocaleString("pt-BR")}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-gray-400 text-sm mb-3">Nenhuma observação ainda</Text>
            )}

            {/* Campo para adicionar nova observação */}
            {isActive && (
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white"
                  placeholder="Digite uma observação..."
                  placeholderTextColor="#9ca3af"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity
                  className="bg-blue-600 rounded-xl px-4 items-center justify-center"
                  onPress={handleAddComment}
                  disabled={addingComment || !commentText.trim()}
                  activeOpacity={0.8}
                >
                  {addingComment ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold">Enviar</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </SectionCard>

          {/* ── Botão de assinatura (se ainda não assinou) ─── */}
          {isActive && !wo.technicianSignature && (
            <TouchableOpacity
              className="bg-gray-800 rounded-2xl py-4 items-center"
              onPress={() => setShowSignModal(true)}
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold">✍ Assinar OS</Text>
            </TouchableOpacity>
          )}

          {wo.technicianSignature && (
            <View className="bg-gray-50 border border-gray-200 rounded-2xl p-3 items-center gap-2">
              <Text className="text-xs text-gray-500">Assinatura do técnico</Text>
              <Image
                source={{ uri: wo.technicianSignature }}
                className="w-full h-24"
                resizeMode="contain"
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ── Modal de Assinatura Digital ─────────────────────── */}
      <Modal
        visible={showSignModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSignModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-900">Assinatura Digital</Text>
            <TouchableOpacity onPress={() => setShowSignModal(false)}>
              <Text className="text-gray-500 text-base">Cancelar</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            <Text className="text-center text-gray-500 text-sm py-3">
              Assine no espaço abaixo com o dedo
            </Text>
            <SignatureCanvas
              ref={sigRef}
              onOK={handleSignatureOK}
              onEmpty={() => Alert.alert("Atenção", "A assinatura está vazia.")}
              descriptionText=""
              clearText="Limpar"
              confirmText="Confirmar assinatura"
              webStyle={`
                .m-signature-pad { box-shadow: none; border: 1px solid #e5e7eb; }
                .m-signature-pad--footer .button { background: #2563eb; color: white; }
                .m-signature-pad--footer .button.clear { background: #f3f4f6; color: #374151; }
              `}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ── Componentes internos ──────────────────────────────────────────

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Text className="text-base">{icon}</Text>
      <Text className="text-sm text-gray-600 flex-1">{text}</Text>
    </View>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl p-4 gap-3">
      <Text className="text-base font-bold text-gray-900">{title}</Text>
      {children}
    </View>
  );
}

function ActionButton({
  label,
  color,
  onPress,
  loading,
}: {
  label: string;
  color: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      className="flex-1 rounded-xl py-3.5 items-center"
      style={{ backgroundColor: color }}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text className="text-white font-bold text-sm">{label}</Text>
      )}
    </TouchableOpacity>
  );
}
