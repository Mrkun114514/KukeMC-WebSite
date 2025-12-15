'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent, ReactRenderer } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Mention from '@tiptap/extension-mention';
import { Markdown } from 'tiptap-markdown';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, CheckSquare, Quote, Code, Link as LinkIcon, 
  Image as ImageIcon, Table as TableIcon, Undo, Redo, 
  Unlink, Plus, ChevronDown, Highlighter, Underline as UnderlineIcon, X, Check
} from 'lucide-react';
import clsx from 'clsx';
import api, { generateUploadHeaders } from '../utils/api';
import './MarkdownEditor.css';
import MentionList from './MarkdownEditorMentionList';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

// --- Image Processing Utilities ---

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
           const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
           width = Math.round(width * ratio);
           height = Math.round(height * ratio);
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

const calculateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// --- Components ---

const MenuButton = ({ onClick, isActive, disabled, children, title, className, showChevron }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      "p-1.5 rounded-md transition-all duration-200 flex items-center gap-1",
      isActive 
        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
      disabled && "opacity-30 cursor-not-allowed",
      className
    )}
    title={title}
    type="button"
  >
    {children}
    {showChevron && <ChevronDown size={12} className="opacity-50" />}
  </button>
);

const Dropdown = ({ trigger, children, isOpen, onClose, align = 'left' }: { trigger: React.ReactNode, children: React.ReactNode, isOpen: boolean, onClose: () => void, align?: 'left' | 'right' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={ref}>
      {trigger}
      {isOpen && (
        <div 
          className={clsx(
            "absolute top-full mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 min-w-[150px] p-1 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-0.5",
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

const ColorPicker = ({ editor, isOpen, onClose }: { editor: any, isOpen: boolean, onClose: () => void }) => {
  const colors = [
    { name: 'Purple', value: '#9333EA' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Yellow', value: '#EAB308' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#22C55E' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Gray', value: '#6B7280' },
  ];

  return (
    <Dropdown
      isOpen={isOpen}
      onClose={onClose}
      trigger={
        <MenuButton onClick={onClose} isActive={editor.isActive('highlight')} title="Highlight" showChevron>
          <Highlighter size={16} />
        </MenuButton>
      }
    >
      <div className="p-2 grid grid-cols-4 gap-1 w-[140px]">
        {colors.map((color) => (
          <button
            key={color.value}
            className={clsx(
              "w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform",
              editor.isActive('highlight', { color: color.value }) && "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-zinc-800"
            )}
            style={{ backgroundColor: color.value }}
            onClick={() => {
              editor.chain().focus().toggleHighlight({ color: color.value }).run();
              onClose(); // Keep open? Usually close.
            }}
            title={color.name}
          />
        ))}
        <button
          className="w-6 h-6 rounded-full border border-gray-200 dark:border-gray-600 hover:scale-110 transition-transform flex items-center justify-center text-gray-500 hover:text-red-500"
          onClick={() => {
            editor.chain().focus().unsetHighlight().run();
            onClose();
          }}
          title="Clear Highlight"
        >
          <X size={14} />
        </button>
      </div>
    </Dropdown>
  );
};

const Divider = () => <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 self-center" />;

const MenuBar = ({ editor, onImageUpload }: { editor: any, onImageUpload: () => void }) => {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');

  if (!editor) return null;

  const toggleDropdown = (name: string) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  const closeDropdown = () => setActiveDropdown(null);

  // Helper to get current heading icon
  const getCurrentHeadingIcon = () => {
    if (editor.isActive('heading', { level: 1 })) return <Heading1 size={18} />;
    if (editor.isActive('heading', { level: 2 })) return <Heading2 size={18} />;
    if (editor.isActive('heading', { level: 3 })) return <Heading3 size={18} />;
    if (editor.isActive('heading', { level: 4 })) return <Heading4 size={18} />;
    return <Heading1 size={18} />; // Default
  };

  const getCurrentHeadingLabel = () => {
    if (editor.isActive('heading', { level: 1 })) return "H1";
    if (editor.isActive('heading', { level: 2 })) return "H2";
    if (editor.isActive('heading', { level: 3 })) return "H3";
    if (editor.isActive('heading', { level: 4 })) return "H4";
    return "Text";
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-20 rounded-t-xl">
      
      {/* History */}
      <div className="flex items-center gap-0.5">
        <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <Undo size={16} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <Redo size={16} />
        </MenuButton>
      </div>

      <Divider />

      {/* Heading Dropdown */}
      <Dropdown
        isOpen={activeDropdown === 'heading'}
        onClose={closeDropdown}
        trigger={
          <MenuButton 
            onClick={() => toggleDropdown('heading')} 
            isActive={editor.isActive('heading')} 
            title="Headings"
            showChevron
            className="w-16 justify-between"
          >
            <span className="font-medium text-sm">{getCurrentHeadingLabel()}</span>
          </MenuButton>
        }
      >
        <button
          className={clsx(
            "flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md",
            editor.isActive('heading', { level: 1 }) && "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
          )}
          onClick={() => {
            editor.chain().focus().toggleHeading({ level: 1 }).run();
            closeDropdown();
          }}
        >
          <Heading1 size={16} />
          <span>Heading 1</span>
        </button>
        <button
          className={clsx(
            "flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md",
            editor.isActive('heading', { level: 2 }) && "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
          )}
          onClick={() => {
            editor.chain().focus().toggleHeading({ level: 2 }).run();
            closeDropdown();
          }}
        >
          <Heading2 size={16} />
          <span>Heading 2</span>
        </button>
        <button
          className={clsx(
            "flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md",
            editor.isActive('heading', { level: 3 }) && "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
          )}
          onClick={() => {
            editor.chain().focus().toggleHeading({ level: 3 }).run();
            closeDropdown();
          }}
        >
          <Heading3 size={16} />
          <span>Heading 3</span>
        </button>
        <button
          className={clsx(
            "flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md",
            editor.isActive('heading', { level: 4 }) && "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
          )}
          onClick={() => {
            editor.chain().focus().toggleHeading({ level: 4 }).run();
            closeDropdown();
          }}
        >
          <Heading4 size={16} />
          <span>Heading 4</span>
        </button>
      </Dropdown>

      {/* List Dropdown */}
      <Dropdown
        isOpen={activeDropdown === 'list'}
        onClose={closeDropdown}
        trigger={
          <MenuButton 
            onClick={() => toggleDropdown('list')} 
            isActive={editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList')} 
            title="Lists"
            showChevron
          >
            {editor.isActive('orderedList') ? <ListOrdered size={16} /> : 
             editor.isActive('taskList') ? <CheckSquare size={16} /> : 
             <List size={16} />}
          </MenuButton>
        }
      >
        <button
          className={clsx(
            "flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md",
            editor.isActive('bulletList') && "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
          )}
          onClick={() => {
            editor.chain().focus().toggleBulletList().run();
            closeDropdown();
          }}
        >
          <List size={16} />
          <span>Bullet List</span>
        </button>
        <button
          className={clsx(
            "flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md",
            editor.isActive('orderedList') && "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
          )}
          onClick={() => {
            editor.chain().focus().toggleOrderedList().run();
            closeDropdown();
          }}
        >
          <ListOrdered size={16} />
          <span>Ordered List</span>
        </button>
        <button
          className={clsx(
            "flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md",
            editor.isActive('taskList') && "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
          )}
          onClick={() => {
            editor.chain().focus().toggleTaskList().run();
            closeDropdown();
          }}
        >
          <CheckSquare size={16} />
          <span>Task List</span>
        </button>
      </Dropdown>

      <Divider />

      {/* Formatting */}
      <div className="flex items-center gap-0.5">
        <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
          <Bold size={16} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
          <Italic size={16} />
        </MenuButton>
        
        {/* Underline */}
        <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
          <UnderlineIcon size={16} />
        </MenuButton>

        {/* Highlight Color Picker */}
        <ColorPicker 
          editor={editor} 
          isOpen={activeDropdown === 'highlight'} 
          onClose={() => toggleDropdown('highlight')} 
        />

        <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strike">
          <Strikethrough size={16} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Quote">
          <Quote size={16} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Block">
          <Code size={16} />
        </MenuButton>
      </div>
      
      <Divider />

      {/* Insert */}
      <div className="flex items-center gap-0.5">
        <Dropdown
          isOpen={activeDropdown === 'link'}
          onClose={closeDropdown}
          align="right"
          trigger={
            <MenuButton 
              onClick={() => {
                if (activeDropdown === 'link') {
                  closeDropdown();
                } else {
                  const previousUrl = editor.getAttributes('link').href;
                  setLinkUrl(previousUrl || '');
                  toggleDropdown('link');
                }
              }} 
              isActive={editor.isActive('link')} 
              title="Link"
            >
              <LinkIcon size={16} />
            </MenuButton>
          }
        >
          <div className="p-2 w-72 flex items-center gap-2">
            <input
              type="text"
              className="flex-1 bg-gray-50 dark:bg-zinc-700 border-none rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none min-w-0"
              placeholder="Paste link..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (linkUrl === '') {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                  } else {
                    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
                  }
                  closeDropdown();
                }
              }}
              autoFocus
            />
            <button
              onClick={() => {
                if (linkUrl === '') {
                  editor.chain().focus().extendMarkRange('link').unsetLink().run();
                } else {
                  editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
                }
                closeDropdown();
              }}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded dark:text-blue-400 dark:hover:bg-blue-900/30"
              title="Apply"
            >
              <Check size={14} />
            </button>
            {editor.isActive('link') && (
              <button
                 onClick={() => {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                    closeDropdown();
                 }}
                 className="p-1.5 text-red-500 hover:bg-red-50 rounded dark:hover:bg-red-900/30"
                 title="Remove Link"
              >
                <Unlink size={14} />
              </button>
            )}
          </div>
        </Dropdown>
        
        <MenuButton onClick={onImageUpload} title="Upload Image">
          <ImageIcon size={16} />
        </MenuButton>

        <MenuButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
          <TableIcon size={16} />
        </MenuButton>
      </div>

    </div>
  );
};

const BubbleMenuContent = ({ editor, menuRef }: { editor: any, menuRef: React.RefObject<HTMLDivElement> }) => {
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  useEffect(() => {
    if (isLinkMode) {
      setLinkUrl(editor.getAttributes('link').href || '');
    }
  }, [isLinkMode, editor]);

  if (isLinkMode) {
    return (
      <div ref={menuRef} className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100">
        <input
          type="text"
          className="bg-gray-50 dark:bg-zinc-700 border-none rounded px-2 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none w-48"
          placeholder="Paste link..."
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (linkUrl === '') {
                editor.chain().focus().extendMarkRange('link').unsetLink().run();
              } else {
                editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
              }
              setIsLinkMode(false);
            }
          }}
          autoFocus
        />
        <button
          onClick={() => {
            if (linkUrl === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run();
            } else {
              editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
            }
            setIsLinkMode(false);
          }}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded dark:text-blue-400 dark:hover:bg-blue-900/30"
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => setIsLinkMode(false)}
          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded dark:text-gray-400 dark:hover:bg-zinc-700"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="flex items-center gap-0.5 p-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100">
      <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
        <Bold size={14} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
        <Italic size={14} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}>
        <UnderlineIcon size={14} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}>
        <Strikethrough size={14} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')}>
        <Highlighter size={14} />
      </MenuButton>
      
      <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1 self-center" />
      
      <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })}>
        <Heading1 size={14} />
      </MenuButton>
      <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })}>
        <Heading2 size={14} />
      </MenuButton>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1 self-center" />

      <MenuButton
        onClick={() => {
           setIsLinkMode(true);
        }}
        isActive={editor.isActive('link')}
      >
        <LinkIcon size={14} />
      </MenuButton>
    </div>
  );
};

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "写点什么...", 
  className,
  minHeight = "min-h-[200px]"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedCacheRef = useRef<Map<string, string>>(new Map());
  const activeUploadsRef = useRef<Map<string, Promise<string>>>(new Map());
  const [isMounted, setIsMounted] = React.useState(false);
  const bubbleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Function to handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    try {
      // 1. Calculate hash for deduplication
      const fileHash = await calculateFileHash(file);
      
      // 2. Check if already uploaded
      if (uploadedCacheRef.current.has(fileHash)) {
         return uploadedCacheRef.current.get(fileHash)!;
      }

      // 3. Check if currently uploading
      let uploadPromise = activeUploadsRef.current.get(fileHash);
      
      if (!uploadPromise) {
         uploadPromise = (async () => {
            let fileToUpload = file;
            if (fileToUpload.size > 5 * 1024 * 1024) {
               fileToUpload = await compressImage(fileToUpload);
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

         activeUploadsRef.current.set(fileHash, uploadPromise);
      }

      const url = await uploadPromise;
      uploadedCacheRef.current.set(fileHash, url);
      activeUploadsRef.current.delete(fileHash);
      return url;
    } catch (err) {
      console.error("Upload failed", err);
      throw err;
    }
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit?.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Placeholder?.configure({
        placeholder,
      }),
      ImageExtension,
      LinkExtension?.configure({
        openOnClick: false,
        autolink: true,
      }),
      TaskList,
      TaskItem?.configure({
        nested: true,
      }),
      Table?.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      Highlight?.configure({ multicolor: true }),
      Mention?.configure({
        HTMLAttributes: {
          class: 'text-blue-500 bg-blue-100 dark:bg-blue-900 rounded px-1 py-0.5 font-medium decoration-clone',
        },
        suggestion: {
          items: async ({ query }) => {
            try {
               if (!query) return []; 
               const res = await api.get(`/api/profile/search?q=${query}`);
               return res.data.slice(0, 5).map((u: any) => ({ username: u.username, avatar: u.avatar }));
            } catch (e) {
               console.error(e);
               return [];
            }
          },
          render: () => {
            let component: ReactRenderer;
            let popup: any;

            return {
              onStart: (props) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor,
                });

                if (!props.clientRect) {
                  return;
                }

                popup = tippy('body', {
                  getReferenceClientRect: props.clientRect as any,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: 'manual',
                  placement: 'bottom-start',
                });
              },

              onUpdate(props) {
                component.updateProps(props);

                if (!props.clientRect) {
                  return;
                }

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              },

              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup[0].hide();
                  return true;
                }

                return (component.ref as any)?.onKeyDown(props);
              },

              onExit() {
                popup[0].destroy();
                component.destroy();
              },
            };
          },
        },
      }),
      Markdown?.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ].filter(Boolean) as any,
    content: value,
    editorProps: {
      attributes: {
        class: clsx(
          'prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none px-4 py-2',
          minHeight
        ),
      },
    },
    onUpdate: ({ editor }) => {
      // Safely access getMarkdown
      if (editor.storage.markdown && typeof editor.storage.markdown.getMarkdown === 'function') {
        onChange(editor.storage.markdown.getMarkdown());
      } else {
        // Fallback to HTML if markdown is not available
        onChange(editor.getHTML());
      }
    },
  });

  // Hack to force z-index on the BubbleMenu container created by Tiptap
  useEffect(() => {
    // Traverse up to find the Tiptap BubbleMenu container
    // Structure: Container (created by Tiptap) -> Wrapper (created by BubbleMenu React component) -> My Div (ref)
    const myDiv = bubbleMenuRef.current;
    if (myDiv) {
      const wrapper = myDiv.parentElement;
      const container = wrapper?.parentElement;
      
      if (container) {
        container.style.zIndex = '99999';
        container.style.visibility = 'visible'; // Ensure it's visible
      }
    }
  }, [isMounted, editor]);

  // Sync value changes from parent (e.g. initial load or external reset)
  useEffect(() => {
    if (editor && value) {
      // Check if current content matches value to avoid loops/cursor jumps
      // If markdown storage is available, use it to check
      let currentContent = '';
      if (editor.storage.markdown && typeof editor.storage.markdown.getMarkdown === 'function') {
        currentContent = editor.storage.markdown.getMarkdown();
      } else {
        currentContent = editor.getHTML();
      }

      if (value !== currentContent) {
        editor.commands.setContent(value);
      }
    }
  }, [value, editor]);

  const onImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Use ObjectURL for immediate preview
      const objectUrl = URL.createObjectURL(file);
      
      // Insert placeholder image
      if (editor) {
        editor.chain().focus().setImage({ src: objectUrl, alt: 'Uploading...' }).run();
      }

      try {
        const url = await handleImageUpload(file);
        
        // Replace the object URL with the real URL
        // Since we can't easily find the exact node by objectUrl in Tiptap without traversing,
        // we can assume the user hasn't deleted it yet or just use the current selection if it's the image.
        // A more robust way:
        if (editor && url) {
           // Create a transaction to replace the src
           const { state, view } = editor;
           let found = false;
           state.doc.descendants((node: any, pos: number) => {
             if (!found && node.type.name === 'image' && node.attrs.src === objectUrl) {
                const transaction = state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  src: url,
                  alt: file.name
                });
                view.dispatch(transaction);
                found = true;
                return false; // Stop traversal
             }
             return true;
           });
        }
      } catch (error) {
        console.error("Image upload failed", error);
        alert('Image upload failed');
        // Ideally remove the image
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [editor, handleImageUpload]);

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={clsx(
      "border border-gray-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm transition-shadow duration-200 hover:shadow-md", 
      className
    )}>
      <div className="sticky top-0 z-10">
        <MenuBar editor={editor} onImageUpload={triggerImageUpload} />
      </div>
      
      {editor && isMounted && (
        <BubbleMenu 
          editor={editor} 
          pluginKey="bubbleMenu"
          appendTo={() => document.body}
          updateDelay={100}
          options={{
            strategy: 'fixed',
            placement: 'top-start',
            offset: 10,
          }}
        >
          <BubbleMenuContent editor={editor} menuRef={bubbleMenuRef} />
        </BubbleMenu>
      )}

      <EditorContent editor={editor} />
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={onImageSelect}
      />
    </div>
  );
};

export default MarkdownEditor;
