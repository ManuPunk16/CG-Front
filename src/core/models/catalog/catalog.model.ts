export interface Catalog {
  _id: string;
  name: string;
  type: string;
  active: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
}

export type CatalogType =
  | 'areas'
  | 'estatus'
  | 'instrumentos'
  | 'instituciones';
