export type EmailFlowStep = 'awaiting_destino' | 'awaiting_asunto' | 'awaiting_cuerpo';

export interface EmailSessionData {
    step: EmailFlowStep;
    destino?: string;
    asunto?: string;
    cuerpo?: string;
}