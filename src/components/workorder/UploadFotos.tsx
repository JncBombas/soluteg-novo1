import React, { useState } from 'react';
import axios from 'axios';

interface Props {
  workOrderId: number;
  onSuccess?: () => void;
}

export const UploadFotos: React.FC<Props> = ({ workOrderId, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const formData = new FormData();

    // IMPORTANTE: O nome 'files' deve ser igual ao do seu Backend!
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      setLoading(true);
      // Ajuste a URL para a rota que criamos no seu Ubuntu
      await axios.post(`/api/work-orders/${workOrderId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert(`${files.length} fotos enviadas com sucesso!`);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao enviar fotos. Verifique o tamanho (máx 50MB no total).");
    } finally {
      setLoading(false);
      e.target.value = ''; // Limpa o campo para novo upload
    }
  };

  return (
    <div style={{ padding: '15px', border: '1px dashed #D4A84B', borderRadius: '8px', textAlign: 'center' }}>
      <label style={{ cursor: 'pointer', color: '#D4A84B', fontWeight: 'bold' }}>
        {loading ? 'Enviando...' : '📷 Adicionar Fotos da Manutenção'}
        <input
          type="file"
          multiple // Permite selecionar várias de uma vez
          accept="image/*" // Abre a câmera ou galeria de fotos
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={loading}
        />
      </label>
      <p style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
        Selecione até 10 fotos por vez.
      </p>
    </div>
  );
};