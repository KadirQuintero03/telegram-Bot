// Tipos de media que el bot puede recibir y almacenar
export type MediaCategory = 'Imagenes' | 'Video' | 'Audio' | 'Documentos';

export interface MediaFile {
    category: MediaCategory;
    fileId: string;
    fileName: string;
    mimeType: string;
    fileSize?: number;
}

// Mapa extensible: agrega aquí nuevas categorías en el futuro
export const CATEGORY_DIRS: Record<MediaCategory, string> = {
    Imagenes: 'Imagenes',
    Video: 'Video',
    Audio: 'Audio',
    Documentos: 'Documentos',
};