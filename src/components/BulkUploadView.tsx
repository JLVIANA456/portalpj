/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState } from "react";
import { PJUser } from "../types";
import { addInvoice, getSupabaseConfig } from "../lib/db";
import { supabase } from "../lib/supabase";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  Trash2,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  SendHorizonal,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BulkUploadViewProps {
  user: PJUser;
  onUploadSuccess: () => void;
}

interface FileEntry {
  id: string;
  name: string;
  size: number;
  type: string;
  base64Url: string;
  rawFile: File;
}

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "xml", "xlsx", "csv"];
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/xml",
  "application/xml",
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const getFileExtension = (fileName: string) =>
  fileName.split(".").pop()?.toLowerCase() || "";

const getFileIcon = (fileType: string, fileName?: string) => {
  const ext = fileName ? getFileExtension(fileName) : "";
  if (fileType.includes("pdf") || ext === "pdf") return FileText;
  if (
    fileType.includes("spreadsheet") ||
    fileType.includes("excel") ||
    fileType.includes("csv") ||
    ext === "xlsx" ||
    ext === "csv"
  )
    return FileSpreadsheet;
  if (fileType.includes("xml") || fileType.includes("markup") || ext === "xml")
    return FileCode;
  if (fileType.includes("image") || ["jpg", "jpeg", "png"].includes(ext))
    return ImageIcon;
  return FileText;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1,
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default function BulkUploadView({
  user,
  onUploadSuccess,
}: BulkUploadViewProps) {
  const today = useMemo(() => new Date(), []);
  const defaultDate = today.toISOString().split("T")[0];
  const defaultMonth = MONTHS[today.getMonth()];
  const defaultYear = String(today.getFullYear());

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileValidationError = (file: File) => {
    const ext = getFileExtension(file.name);

    if (file.size > MAX_FILE_SIZE) {
      return `O arquivo "${file.name}" excede o limite máximo de 10MB.`;
    }

    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `O arquivo "${file.name}" possui formato inválido. Envie PDF, JPG, PNG, XML, XLSX ou CSV.`;
    }

    if (file.type && !ACCEPTED_MIME_TYPES.includes(file.type)) {
      return `O arquivo "${file.name}" possui tipo inválido (${file.type}).`;
    }

    return "";
  };

  const createSafeFileName = (fileName: string) => {
    return fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 180);
  };

  const createUniqueId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  };

  const processFiles = (rawFiles: FileList | File[]) => {
    setGlobalError("");

    const selectedFiles = Array.from(rawFiles);
    const validationErrors: string[] = [];

    selectedFiles.forEach((file) => {
      const validationError = getFileValidationError(file);

      if (validationError) {
        validationErrors.push(validationError);
        return;
      }

      const alreadyAdded = files.some(
        (item) => item.name === file.name && item.size === file.size,
      );

      if (alreadyAdded) {
        validationErrors.push(`O arquivo "${file.name}" já foi adicionado.`);
        return;
      }

      const reader = new FileReader();
      const newId = createUniqueId();

      reader.onload = () => {
        setFiles((prev) => [
          ...prev,
          {
            id: newId,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            base64Url: reader.result as string,
            rawFile: file,
          },
        ]);
      };

      reader.onerror = () => {
        setGlobalError(
          `Erro ao ler o arquivo "${file.name}". Tente novamente.`,
        );
      };

      reader.readAsDataURL(file);
    });

    if (validationErrors.length > 0) {
      setGlobalError(validationErrors.join(" "));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = "";
  };

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");

    if (files.length === 0) {
      setGlobalError("Adicione pelo menos um arquivo.");
      return;
    }

    setLoading(true);
    const config = getSupabaseConfig();

    try {
      let authUserId = user.id;

      if (!config.useMockDatabase) {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          throw new Error(
            "Usuário não autenticado no Supabase. Faça login novamente e tente enviar as notas.",
          );
        }

        authUserId = authData.user.id;
      }

      let successCount = 0;

      for (const f of files) {
        let publicUrl = "";

        if (config.useMockDatabase) {
          publicUrl = "mock_url_placeholder_to_save_storage";
        } else {
          const safeName = createSafeFileName(f.rawFile.name);
          const uniqueFileName = `${user.tenantId || "tenant-1"}/${authUserId}/${Date.now()}-${createUniqueId()}-${safeName}`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("notas_fiscais")
              .upload(uniqueFileName, f.rawFile, {
                cacheControl: "3600",
                upsert: false,
                contentType: f.type || undefined,
              });

          if (uploadError) {
            console.error("Erro no upload do Storage:", uploadError);
            throw new Error(
              `Erro ao enviar arquivo "${f.name}" para o Storage: ${uploadError.message}`,
            );
          }

          const storagePath = uploadData?.path || uniqueFileName;
          const { data: urlData } = supabase.storage
            .from("notas_fiscais")
            .getPublicUrl(storagePath);

          if (!urlData?.publicUrl) {
            throw new Error(
              `Arquivo "${f.name}" foi enviado, mas não foi possível gerar o link público.`,
            );
          }

          publicUrl = urlData.publicUrl;
        }

        await addInvoice({
          tenantId: user.tenantId || "tenant-1",
          userId: authUserId,
          companyName: user.companyName,
          cnpj: user.cnpj,
          invoiceNumber: `LOTE-${Date.now()}-${successCount + 1}`,
          issueDate: defaultDate,
          competenciaMonth: defaultMonth,
          competenciaYear: defaultYear,
          amount: 0,
          fileName: f.name,
          fileType: f.type,
          fileSize: f.size,
          downloadUrl: publicUrl,
          status: "pendente",
          notes: "",
        });

        successCount++;
      }

      setSentCount(successCount);
      setSuccess(true);
      setFiles([]);
    } catch (err: any) {
      console.error("Erro ao enviar notas em lote:", err);
      setGlobalError(
        err?.message || "Erro ao enviar notas. Verifique e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Envio de Notas
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Selecione ou arraste múltiplos arquivos de uma vez para envio
          imediato.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl shadow-xl p-8 text-center space-y-4"
          >
            <div className="mx-auto h-16 w-16 bg-emerald-50 dark:bg-emerald-950 rounded-full flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {sentCount} {sentCount === 1 ? "Nota Enviada" : "Notas Enviadas"}{" "}
              com Sucesso!
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Todos os arquivos foram registrados. Nossa equipe analisará cada
              nota para agendar o pagamento.
            </p>
            <div className="pt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm rounded-xl text-white shadow-md cursor-pointer"
              >
                Enviar novo lote
              </button>
              <button
                type="button"
                onClick={onUploadSuccess}
                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-sm rounded-xl text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Ver minhas notas
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            onDragEnter={handleDrag}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Global error */}
            {globalError && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-500 p-4 rounded-r-xl text-rose-700 dark:text-rose-300 text-sm">
                {globalError}
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[200px] ${dragActive
                ? "border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20"
                : "border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-950 bg-white dark:bg-slate-900"
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={handleFileInput}
                accept=".pdf,.jpg,.jpeg,.png,.xml,.xlsx,.csv"
              />
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950 rounded-full text-indigo-600 mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">
                {files.length > 0
                  ? "Clique para adicionar mais arquivos"
                  : "Clique ou arraste múltiplos arquivos aqui"}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                PDF, Imagens, Planilhas ou XML — selecione quantos quiser de uma
                vez
              </p>
            </div>

            {/* File list */}
            <AnimatePresence>
              {files.map((f, index) => {
                const FileIcon = getFileIcon(f.type, f.name);
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.15 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                  >
                    <div className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 rounded-xl text-indigo-600 flex-shrink-0">
                          <FileIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full">
                            Nota {index + 1}
                          </span>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[280px] sm:max-w-sm mt-1">
                            {f.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatFileSize(f.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer flex-shrink-0"
                        aria-label="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Submit footer */}
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl px-5 py-4 shadow-sm border"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {files.length}
                  </span>{" "}
                  {files.length === 1 ? "nota pronta" : "notas prontas"} para
                  envio
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onUploadSuccess}
                    className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white rounded-xl shadow-lg shadow-indigo-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span>Enviando {files.length} nota(s)...</span>
                      </>
                    ) : (
                      <>
                        <SendHorizonal className="w-4 h-4" />
                        <span>Enviar {files.length} Nota(s) para Análise</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
