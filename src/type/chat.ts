export type Source = string | {
  file: string;
  snippet?: string;
};

export type Message = {
  role: "user" | "bot";
  text: string;
  sources?: Source[];
  error?: boolean;
  retry?: string;
};

export type ChatWidgetProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  pending: string | null;
  clearPending: () => void;
};
