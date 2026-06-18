"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileVideo, FileAudio, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  className?: string;
}

export const Dropzone = ({ onFileSelect, selectedFile, className }: DropzoneProps) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      const validTypes = ["video/mp4", "audio/mp3", "audio/mpeg", "audio/wav", "audio/x-wav"];
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      if (
        validTypes.includes(file.type) || 
        ["mp4", "mp3", "wav"].includes(extension || "")
      ) {
        onFileSelect(file);
      } else {
        alert("Please upload a valid .mp4, .mp3, or .wav file.");
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    processFiles(e.target.files);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return null;
    const isVideo = selectedFile.type.startsWith("video/") || selectedFile.name.endsWith(".mp4");
    return isVideo ? (
      <FileVideo className="w-8 h-8 text-violet-400" />
    ) : (
      <FileAudio className="w-8 h-8 text-violet-400" />
    );
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".mp4,.mp3,.wav,video/mp4,audio/mp3,audio/mpeg,audio/wav"
        onChange={handleChange}
      />

      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={cn(
            "w-full h-48 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 p-6 text-center cursor-pointer transition-all duration-300",
            isDragActive
              ? "border-violet-500 bg-violet-600/5 scale-[0.99]"
              : "border-neutral-800 bg-neutral-900/10 hover:border-neutral-700 hover:bg-neutral-900/20"
          )}
        >
          <div className="p-3 rounded-full bg-neutral-900/80 border border-neutral-800/80 group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-6 h-6 text-neutral-400" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-neutral-200">
              Drag & drop your audio or video file here
            </p>
            <p className="text-xs text-neutral-500">
              Supports MP4, MP3, or WAV (up to 100MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full p-4 rounded-2xl border border-neutral-800 bg-neutral-900/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
              {getFileIcon()}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-semibold text-neutral-200 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-neutral-500">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={removeFile}
            className="p-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 text-neutral-400 hover:text-neutral-200 cursor-pointer transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
