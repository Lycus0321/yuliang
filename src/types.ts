export type Region = 'global' | 'china';

export type Spool = {
  id: number;
  filamentVendor?: string;
  filamentType?: string;
  filamentName?: string;
  filamentId?: string;
  color?: string;
  colors?: string[];
  netWeight?: number;
  totalNetWeight?: number;
  note?: string;
  status?: number;
  createType?: string;
  displayName?: string;
  inPrinter?: boolean;
  devId?: string;
  deviceName?: string;
  amsSn?: string;
  amsId?: number;
  amsType?: number;
  slotId?: number;
  trayIdName?: string;
};

export type Session = {
  token?: string;
  region: Region;
  email?: string;
  demo?: boolean;
};

export type LoginResult =
  | { kind: 'success'; session: Session }
  | { kind: 'code-required'; message: string }
  | { kind: 'tfa-required'; message: string; tfaKey?: string };

export type SpoolUpdate = {
  filamentVendor?: string;
  filamentType?: string;
  filamentName?: string;
  color?: string;
  colors?: string[];
  netWeight?: number;
  totalNetWeight?: number;
  note?: string;
  displayName?: string;
  filamentId?: string;
};

export type SpoolEditorTab = 'basic' | 'weight';

export type CatalogEntry = {
  vendor: string;
  material: string;
  name: string;
  filamentId: string;
};
