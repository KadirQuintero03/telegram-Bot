import { MediaCategory } from './media.types.js';

export type CloudFlowStep = 'awaiting_specific_range' | 'awaiting_unique_number' | null;

export interface CloudSessionData {
    category?: MediaCategory;
    userFolder?: string;
    offset: number;
    pageFiles: string[]; // rutas absolutas de los archivos mostrados en la página actual
    step: CloudFlowStep;
}