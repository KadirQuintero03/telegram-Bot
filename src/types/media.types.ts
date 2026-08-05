
export type MediaCategory = 'Imagenes' | 'Video' | 'Audio' | 'Documentos';

export interface MediaFile {
    category: MediaCategory;
    fileId: string;
    fileName: string;
    mimeType: string;
    fileSize?: number;
}


export const CATEGORY_DIRS: Record<MediaCategory, string> = {
    Imagenes: 'Imagenes',
    Video: 'Video',
    Audio: 'Audio',
    Documentos: 'Documentos',
};