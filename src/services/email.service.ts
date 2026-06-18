import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env.js';

export class EmailService {
    private transporter: Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config.emailHost,
            port: config.emailPort,
            secure: false, // STARTTLS en el puerto 587
            auth: {
                user: config.emailUser,
                pass: config.emailPass,
            },
        });
    }

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        await this.transporter.sendMail({
            from: config.emailUser,
            to,
            subject,
            text: body,
        });
    }
}