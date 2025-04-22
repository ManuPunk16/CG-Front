export interface Catalog {
  _id: string;
  name: string;
  type: string;
  active: boolean;
}

export enum CatalogType {
  INSTITUTION = 'INSTITUTION',
  INSTRUMENT = 'INSTRUMENT',
  OTRAS_CATEGORIAS = 'OTRAS_CATEGORIAS'
}
