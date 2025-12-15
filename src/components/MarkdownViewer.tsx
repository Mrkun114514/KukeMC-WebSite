'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
import clsx from 'clsx';
import './MarkdownEditor.css'; // Re-use styles

interface MarkdownViewerProps {
  content: string;
  className?: string;
  maxHeight?: string;
  disableImages?: boolean;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, className, maxHeight, disableImages = false }) => {
  // Use a key to force re-initialization if content changes significantly? 
  // No, use setContent in useEffect.
  
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      !disableImages ? ImageExtension : undefined,
      LinkExtension.configure({
        openOnClick: true,
        autolink: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Underline,
      Highlight.configure({ multicolor: true }),
      Mention.configure({
        HTMLAttributes: {
          class: 'text-blue-500 bg-blue-100 dark:bg-blue-900 rounded px-1 py-0.5 font-medium decoration-clone',
        },
      }),
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ].filter(Boolean) as any,
    content: content, // Initial content
    editorProps: {
      attributes: {
        class: clsx(
          'prose prose-sm sm:prose dark:prose-invert max-w-none focus:outline-none prose-viewer',
          className
        ),
      },
    },
    shouldRerenderOnTransaction: false, // Performance optimization
  });

  // Update content when prop changes
  useEffect(() => {
    if (editor && content) {
       // We can check if content is different to avoid unnecessary updates
       // But checking markdown vs internal state is hard.
       // editor.commands.setContent(content) parses it again.
       // Since this is a viewer, updates might be infrequent (e.g. edit save).
       // We can just set it.
       
       // Optimization: check if existing content is same?
       // Only if we can get markdown back efficiently.
       // For now, just set it.
       
       // Use { emitUpdate: false } to avoid triggering update loops if we had listeners
       editor.commands.setContent(content, false); 
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
};

export default MarkdownViewer;
