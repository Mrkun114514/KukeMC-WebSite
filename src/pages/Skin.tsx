import React, { useState, useRef } from 'react';
import { useTitle } from '../hooks/useTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, Copy, RefreshCw, AlertCircle, Image as ImageIcon, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import api, { generateUploadHeaders } from '../utils/api';

const Skin = () => {
  useTitle('皮肤上传-KukeMC-我的世界服务器(Minecraft)');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);
    if (!selectedFile.type.startsWith('image/')) {
      setError('请上传有效的图片文件 (PNG, JPG)');
      return;
    }
    // Limit file size to 1MB
    if (selectedFile.size > 1 * 1024 * 1024) {
      setError('皮肤图片大小不能超过 1MB');
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const securityHeaders = await generateUploadHeaders();
      const response = await api.post('/api/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...securityHeaders
        },
      });

      setUploadedUrl(response.data.url);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyCommand = () => {
    if (!uploadedUrl) return;
    const command = `/skin url "${uploadedUrl}"`;
    navigator.clipboard.writeText(command);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const resetUpload = () => {
    setFile(null);
    setUploadedUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300">
            皮肤<span className="text-gradient">上传</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto transition-colors duration-300">
            上传您的自定义皮肤，获取游戏内指令。支持 PNG、JPG 格式，建议尺寸 64x64 或 64x32。
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-panel p-8 rounded-2xl relative overflow-hidden transition-colors duration-300"
          >
            {!uploadedUrl ? (
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={clsx(
                    "w-full max-w-xl h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group",
                    isDragging
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  )}
                >
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    {file ? (
                      <ImageIcon className="w-8 h-8 text-emerald-500 dark:text-emerald-400 transition-colors duration-300" />
                    ) : (
                      <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300" />
                    )}
                  </div>
                  
                  {file ? (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-300">{file.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-300">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-slate-900 dark:text-white mb-1 transition-colors duration-300">点击或拖拽文件到此处</p>
                      <p className="text-sm text-slate-500 transition-colors duration-300">支持 .png, .jpg, .jpeg</p>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-4 flex items-center gap-2 text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-400/10 px-4 py-2 rounded-lg transition-colors duration-300"
                    >
                      <AlertCircle className="w-5 h-5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleUpload}
                  disabled={!file || isUploading}
                  className={clsx(
                    "mt-8 px-8 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all duration-300",
                    !file || isUploading
                      ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-50"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95"
                  )}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      正在上传...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      开始上传
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[400px]">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6"
                >
                  <Check className="w-10 h-10 text-emerald-500 dark:text-emerald-400 transition-colors duration-300" />
                </motion.div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 transition-colors duration-300">上传成功!</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 text-center transition-colors duration-300">
                  您的皮肤已成功上传，请在游戏内使用以下指令更换皮肤
                </p>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-8 max-w-2xl w-full flex flex-col items-center transition-colors duration-300">
                  <div className="mb-4 relative group">
                     <img 
                        src={uploadedUrl} 
                        alt="Skin Preview" 
                        className="h-32 object-contain bg-[url('https://checkerboard-bg.netlify.app/checkerboard.svg')] bg-cover rounded-lg border border-slate-300 dark:border-slate-600 transition-colors duration-300"
                     />
                  </div>
                  
                  <div className="w-full flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                    <code className="flex-1 text-emerald-600 dark:text-emerald-400 font-mono text-sm break-all transition-colors duration-300">
                      /skin url "{uploadedUrl}"
                    </code>
                    <button
                      onClick={handleCopyCommand}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white relative"
                      title="复制指令"
                    >
                      {isCopied ? (
                        <Check className="w-5 h-5 text-emerald-500 dark:text-emerald-400 transition-colors duration-300" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={resetUpload}
                  className="px-6 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 duration-300"
                >
                  <RefreshCw className="w-4 h-4" />
                  上传另一个皮肤
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Skin;
