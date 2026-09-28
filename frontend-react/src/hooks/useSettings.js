import { useState, useEffect } from 'react';

const SETTINGS_KEY = 'student_pocket_settings_v05';

const defaultSettings = {
  currentView: 'flow', // 'flow' | 'split' | 'table'
  isInspectorOpen: true,
  canvasMode: 'both', // 'both' | 'irl' | 'simple'
  scopeFilter: 'all', // 'all' | 'filtered'
  tableSortOrder: 'latest', // 'latest' | 'oldest'
  isTableDetailedMode: false,
  activePocketFilterIds: [],
  tableFilter: 'all', // 'all' | 'income' | 'expense' | 'transfer'
  nodeClickAction: 'both', // 'both' | 'table' | 'inspector'
  panelWidths: { canvas: null, inspector: null, table: null }
};

export function useSettings(allPocketIds = []) {
  const [settings, setSettings] = useState(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...defaultSettings, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load settings from localStorage:', e);
    }
    return defaultSettings;
  });

  // Ensure activePocketFilterIds defaults to all pockets initially
  useEffect(() => {
    if (allPocketIds.length > 0 && settings.activePocketFilterIds.length === 0) {
      setSettings(prev => {
        const next = { ...prev, activePocketFilterIds: [...allPocketIds] };
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        } catch (e) {
          console.warn('Failed to save settings:', e);
        }
        return next;
      });
    }
  }, [allPocketIds.length]);

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
      return next;
    });
  };

  const updateSettings = (partial) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
      return next;
    });
  };

  return { settings, updateSetting, updateSettings };
}
