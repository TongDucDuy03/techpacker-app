import nodemailer from 'nodemailer';
import { config } from '../config/config';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      if (!config.emailUser || !config.emailPass) {
        console.warn('⚠️  Email service not configured. Email functionality will be disabled.');
        return;
      }

      this.transporter = nodemailer.createTransport({
        service: config.emailService === 'gmail' ? 'gmail' : undefined,
        host: config.emailService === 'gmail' ? 'smtp.gmail.com' : undefined,
        port: config.emailService === 'gmail' ? 587 : undefined,
        secure: false, // true for 465, false for other ports
        auth: {
          user: config.emailUser,
          pass: config.emailPass,
        },
      });

      console.log('✅ Email service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
      this.transporter = null;
    }
  }

  /**
   * Send 2FA code via email
   */
  async send2FACode(email: string, code: string, userName?: string): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email service not available');
      return false;
    }

    try {
      const mailOptions = {
        from: `"TechPacker" <${config.emailUser}>`,
        to: email,
        subject: 'Your Two-Factor Authentication Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
              .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
              .code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; padding: 20px; background-color: white; border-radius: 5px; margin: 20px 0; letter-spacing: 5px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>TechPacker</h1>
                <p>Two-Factor Authentication</p>
              </div>
              <div class="content">
                <p>Hello${userName ? ` ${userName}` : ''},</p>
                <p>You have requested to log in to your TechPacker account. Please use the following verification code:</p>
                <div class="code">${code}</div>
                <div class="warning">
                  <strong>⚠️ Security Notice:</strong>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>This code will expire in 10 minutes</li>
                    <li>Never share this code with anyone</li>
                    <li>If you didn't request this code, please ignore this email</li>
                  </ul>
                </div>
                <p>If you didn't request this code, please secure your account immediately.</p>
              </div>
              <div class="footer">
                <p>This is an automated message, please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} TechPacker. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
          TechPacker - Two-Factor Authentication Code
          
          Hello${userName ? ` ${userName}` : ''},
          
          You have requested to log in to your TechPacker account. Please use the following verification code:
          
          ${code}
          
          This code will expire in 10 minutes.
          
          ⚠️ Security Notice:
          - Never share this code with anyone
          - If you didn't request this code, please ignore this email
          
          If you didn't request this code, please secure your account immediately.
          
          This is an automated message, please do not reply.
          © ${new Date().getFullYear()} TechPacker. All rights reserved.
        `,
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ 2FA code sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send 2FA email:', error);
      return false;
    }
  }

  /**
   * Verify email service is working
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;

