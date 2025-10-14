import { useEffect } from 'react';
import { useTechPack } from '../contexts/TechPackContext';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = () => {
  const context = useTechPack();
  const { saveTechPack, exportToPDF, setCurrentTab, state } = context ?? {};
  const { currentTab = 0 } = state ?? {};

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 's',
      ctrlKey: true,
      action: () => saveTechPack?.(),
      description: 'Save tech pack'
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => exportToPDF?.(),
      description: 'Export to PDF'
    },
    {
      key: '1',
      ctrlKey: true,
      action: () => setCurrentTab?.(0),
      description: 'Go to Article Info tab'
    },
    {
      key: '2',
      ctrlKey: true,
      action: () => setCurrentTab?.(1),
      description: 'Go to BOM tab'
    },
    {
      key: '3',
      ctrlKey: true,
      action: () => setCurrentTab?.(2),
      description: 'Go to Measurements tab'
    },
    {
      key: '4',
      ctrlKey: true,
      action: () => setCurrentTab?.(3),
      description: 'Go to How to Measure tab'
    },
    {
      key: '5',
      ctrlKey: true,
      action: () => setCurrentTab?.(4),
      description: 'Go to Colorways tab'
    },
    {
      key: '6',
      ctrlKey: true,
      action: () => setCurrentTab?.(5),
      description: 'Go to Revision History tab'
    },
    {
      key: 'ArrowLeft',
      ctrlKey: true,
      action: () => {
        const prevTab = Math.max(0, currentTab - 1);
        setCurrentTab?.(prevTab);
      },
      description: 'Previous tab'
    },
    {
      key: 'ArrowRight',
      ctrlKey: true,
      action: () => {
        const nextTab = Math.min(5, currentTab + 1);
        setCurrentTab?.(nextTab);
      },
      description: 'Next tab'
    }
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Only allow Ctrl+S for saving even when in input fields
        if (event.ctrlKey && event.key === 's') {
          event.preventDefault();
          saveTechPack?.();
        }
        return;
      }

      const matchingShortcut = shortcuts.find(shortcut => {
        return (
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === event.ctrlKey &&
          !!shortcut.shiftKey === event.shiftKey &&
          !!shortcut.altKey === event.altKey
        );
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, saveTechPack]);

  return shortcuts;
};

export default useKeyboardShortcuts;
