type Actions = {
  expandPanel: () => void;
  collapsePanel: () => void;
  openSettingsMenu: () => void;
  closeSettingsMenu: () => void;
};

type ControlPanelTypes = {
  expanded: boolean;
  // tracks whether the settings popup menu is open
  settingsMenuOpen: boolean;
  actions: Actions;
};

export type { ControlPanelTypes };
