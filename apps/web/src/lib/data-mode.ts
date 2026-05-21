export type DataMode = 'test' | 'live';

export interface DataModeSettings {
  mode: DataMode;
  lastChangedAt: string | null;
  lastChangedBy: string | null;
}

const g = globalThis as unknown as { __dataModeSettings?: DataModeSettings };

function defaults(): DataModeSettings {
  return {
    mode: 'test',
    lastChangedAt: null,
    lastChangedBy: null,
  };
}

export function getDataModeSettings(): DataModeSettings {
  if (!g.__dataModeSettings) g.__dataModeSettings = defaults();
  return g.__dataModeSettings;
}

export function getDataMode(): DataMode {
  return getDataModeSettings().mode;
}

export function setDataMode(mode: DataMode, changedBy?: string): void {
  const settings = getDataModeSettings();
  settings.mode = mode;
  settings.lastChangedAt = new Date().toISOString();
  settings.lastChangedBy = changedBy ?? null;
}
