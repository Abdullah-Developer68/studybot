type Actions = {
  expandPanel: () => void;
  collapsePanel: () => void;
};

type ControlPanelTypes = {
  expanded: boolean;
  actions: Actions;
};

export type { ControlPanelTypes };
