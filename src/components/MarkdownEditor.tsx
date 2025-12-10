import React, { useEffect, useRef, useState } from 'react';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import './MarkdownEditor.css'; // Import custom overrides
import clsx from 'clsx';
import api, { generateUploadHeaders } from '../utils/api';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "写点什么...", 
  className,
  minHeight = "min-h-[200px]"
}) => {
  const [vditor, setVditor] = useState<Vditor>();
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);
  const userCacheRef = useRef<{value: string, html: string}[]>([]);
  // Cache for deduplication: hash -> url
  const uploadedCacheRef = useRef<Map<string, string>>(new Map());
  // Cache for pending uploads: hash -> promise
  const activeUploadsRef = useRef<Map<string, Promise<string>>>(new Map());

  // Helper to calculate file hash
  const calculateFileHash = async (file: File): Promise<string> => {
     const buffer = await file.arrayBuffer();
     const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
     const hashArray = Array.from(new Uint8Array(hashBuffer));
     return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  useEffect(() => {
    if (!editorRef.current) return;

    // Clear previous instance if exists (to prevent duplicates in strict mode)
    if (editorRef.current) {
       editorRef.current.innerHTML = '';
    }

    const vditorInstance = new Vditor(editorRef.current, {
      value: value,
      mode: 'wysiwyg', // WYSIWYG mode
      height: 400,
      minHeight: 300,
      placeholder,
      lang: 'zh_CN',
      theme: 'classic', // Default, will be updated by effect
      cache: {
        enable: false,
      },
      toolbar: [
        'emoji', 'headings', 'bold', 'italic', 'strike', 'link', '|',
        'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
        'quote', 'line', 'code', 'inline-code', 'insert-before', 'insert-after', '|',
        'upload', 'table', '|',
        'undo', 'redo', '|',
        'edit-mode',
      ],
      hint: {
        at: (key: string) => {
            // Note: Vditor expects synchronous return. 
            // We trigger fetch if key is present, but return cached/empty for now.
            // This is a best-effort approach.
            if (key) {
                api.get(`/api/profile/search?q=${key}`).then(res => {
                    userCacheRef.current = res.data.map((u: any) => ({
                        value: '@' + u.username,
                        html: `<div class="flex items-center gap-2"><img src="${u.avatar || `https://cravatar.eu/helmavatar/${u.username}/16.png`}" class="w-5 h-5 rounded-full"/> ${u.username}</div>`
                    }));
                }).catch(console.error);
            }
            // Return whatever we have that matches
            return userCacheRef.current.filter(u => u.value.toLowerCase().includes(key.toLowerCase()));
        }
      } as any,
      after: () => {
        setVditor(vditorInstance);
      },
      input: (val) => {
        isUpdatingRef.current = true;
        onChange(val);
        // Reset flag after a short delay to ensure we don't block prop updates if they loop back quickly
        setTimeout(() => { isUpdatingRef.current = false; }, 0);
      },
      upload: {
        accept: 'image/*',
        multiple: false,
        handler: async (files) => {
          for (const file of files) {
            const placeholderText = `![⏳ 正在上传 ${file.name}...](https://cdnjs.cloudflare.com/ajax/libs/galleriffic/2.0.1/css/loader.gif)`;
            
            // Insert placeholder and show loading tip
            vditorInstance.insertValue(placeholderText);
            vditorInstance.tip(`正在上传 ${file.name}...`, 0);

            try {
              // 1. Calculate hash for deduplication
              const fileHash = await calculateFileHash(file);
              
              // 2. Check if already uploaded
              if (uploadedCacheRef.current.has(fileHash)) {
                 const url = uploadedCacheRef.current.get(fileHash)!;
                 const name = file.name;
                 const finalMarkdown = `![${name}](${url})`;
                 
                 const currentVal = vditorInstance.getValue();
                 const newVal = currentVal.replace(placeholderText, finalMarkdown);
                 vditorInstance.setValue(newVal);
                 vditorInstance.tip('秒传成功 (已存在)', 2000);
                 continue; // Skip upload
              }

              // 3. Check if currently uploading (deduplicate requests)
              let uploadPromise = activeUploadsRef.current.get(fileHash);
              
              if (!uploadPromise) {
                 // Start new upload task
                 uploadPromise = (async () => {
                    let fileToUpload = file;
              
                    // Compress if large
                    if (fileToUpload.size > 5 * 1024 * 1024) {
                       try {
                          fileToUpload = await compressImage(fileToUpload);
                          if (fileToUpload.size > 5 * 1024 * 1024) {
                             throw new Error('图片压缩后仍然超过5MB限制，请选择更小的图片');
                          }
                          // Recalculate hash for compressed file? 
                          // No, we map original file hash to result url. 
                          // If user uploads same large file again, we want to skip compression too.
                       } catch (e: any) {
                          console.error('Compression failed', e);
                       }
                    }

                    const formData = new FormData();
                    formData.append('file', fileToUpload);
                    
                    const securityHeaders = await generateUploadHeaders();
                    
                    const response = await api.post<{ url: string }>('/api/upload/image', formData, {
                      headers: {
                        'Content-Type': 'multipart/form-data',
                        ...securityHeaders,
                      },
                    });
                    
                    return response.data.url;
                 })();

                 // Store promise in cache
                 activeUploadsRef.current.set(fileHash, uploadPromise);
              } else {
                 vditorInstance.tip('正在合并重复上传任务...', 0);
              }

              // Await result (whether new or existing promise)
              const url = await uploadPromise;
              
              // Cache result
              uploadedCacheRef.current.set(fileHash, url);
              activeUploadsRef.current.delete(fileHash); // Clean up pending

              const name = file.name;
              const finalMarkdown = `![${name}](${url})`;
              
              // Replace placeholder with actual image
              const currentVal = vditorInstance.getValue();
              const newVal = currentVal.replace(placeholderText, finalMarkdown);
              vditorInstance.setValue(newVal);
              
              vditorInstance.tip('上传成功', 2000);
            } catch (err: any) {
              console.error('Failed to upload image:', err);
              // Clean up pending on error
              const fileHash = await calculateFileHash(file).catch(() => null);
              if (fileHash) activeUploadsRef.current.delete(fileHash);

              const msg = err.response?.data?.detail || err.message || '上传失败';
              
              // Remove placeholder or show error
              const currentVal = vditorInstance.getValue();
              const newVal = currentVal.replace(placeholderText, `[上传失败: ${file.name}]`);
              vditorInstance.setValue(newVal);
              
              vditorInstance.tip(msg, 3000);
            }
          }
          return null;
        },
      },
      preview: {
        theme: {
          current: 'light',
          path: 'https://cdn.jsdelivr.net/npm/vditor/dist/css/content-theme',
        },
      },
    });

    // setVditor(vditorInstance); // Removed, set in after callback

    return () => {
      try {
        vditorInstance?.destroy();
      } catch (e) {
        // Ignore destroy error in strict mode
      }
      setVditor(undefined);
    };
  }, []); // Run once on mount

  // ... keep existing effects ...
    useEffect(() => {
    if (vditor && !isUpdatingRef.current && value !== vditor.getValue()) {
      vditor.setValue(value);
    }
  }, [value, vditor]);

  // Dark mode sync
  useEffect(() => {
    if (vditor) {
        const isDark = document.documentElement.classList.contains('dark');
        vditor.setTheme(isDark ? 'dark' : 'classic', isDark ? 'dark' : 'light');
    }
  }, [vditor]);

  return <div ref={editorRef} className={clsx("vditor-reset", minHeight, className)} />;
};

const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
       const img = new Image();
       const reader = new FileReader();
       
       reader.onload = (e) => {
          img.src = e.target?.result as string;
       };
       reader.onerror = reject;
       
       img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if too large (max dimension 1920px)
          const MAX_DIMENSION = 1920;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
             if (width > height) {
                height *= MAX_DIMENSION / width;
                width = MAX_DIMENSION;
             } else {
                width *= MAX_DIMENSION / height;
                height = MAX_DIMENSION;
             }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
             reject(new Error('Canvas context not available'));
             return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
             if (blob) {
                resolve(new File([blob], file.name, {
                   type: 'image/jpeg',
                   lastModified: Date.now()
                }));
             } else {
                reject(new Error('Canvas to Blob failed'));
             }
          }, 'image/jpeg', 0.8);
       };
       
       img.onerror = () => reject(new Error('Image load failed'));
    });
 };

export default MarkdownEditor;
