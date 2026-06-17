// Información extraída de un video de TikTok a partir del HTML público de la página
export interface TikTokVideoInfo {
    id: string;
    description: string;
    author: string;
    durationSeconds: number;
    coverUrl: string;
    /** URL directa del video sin marca de agua, en la mejor calidad disponible */
    downloadUrl: string;
}

// Estructura mínima (y permisiva) del JSON embebido que usamos para extraer el video.
// TikTok no documenta esto oficialmente, por eso se tipa de forma flexible.
export interface TikTokRawVideo {
    id?: string;
    duration?: number;
    cover?: string;
    originCover?: string;
    playAddr?: string;
    downloadAddr?: string;
    play_addr?: { url_list?: string[] };
    bitrateInfo?: Array<{
        Bitrate?: number;
        PlayAddr?: { UrlList?: string[] };
        playAddr?: { urlList?: string[] };
    }>;
}

export interface TikTokRawItemStruct {
    id?: string;
    desc?: string;
    author?: { uniqueId?: string; nickname?: string };
    video?: TikTokRawVideo;
}