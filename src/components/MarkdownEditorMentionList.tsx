import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import clsx from 'clsx';

interface User {
  username: string;
  avatar?: string;
}

interface MentionListProps {
  items: User[];
  command: (props: { id: string; label: string }) => void;
}

const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.username, label: item.username });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[150px] p-1 z-50">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={clsx(
              'flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-sm transition-colors',
              index === selectedIndex
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            key={index}
            onClick={() => selectItem(index)}
          >
            <img
              src={item.avatar || `https://cravatar.eu/helmavatar/${item.username}/24.png`}
              alt={item.username}
              className="w-5 h-5 rounded-full"
            />
            <span>{item.username}</span>
          </button>
        ))
      ) : (
        <div className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
          No results
        </div>
      )}
    </div>
  );
});

MentionList.displayName = 'MentionList';

export default MentionList;
