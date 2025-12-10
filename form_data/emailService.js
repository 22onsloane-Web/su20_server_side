// const nodemailer = require('nodemailer');
// require('dotenv').config();

// class EmailService {
//   constructor() {
//     // Configure your email transporter for Office365
//     this.transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST,
//       port: parseInt(process.env.SMTP_PORT),
//       secure: process.env.SMTP_SECURE === 'true', // false for 587, true for 465
//       auth: {
//         user: process.env.SMTP_USER,
//         pass: process.env.SMTP_PASSWORD
//       },
//       tls: {
//         ciphers: 'SSLv3',
//         rejectUnauthorized: false
//       }
//     });

//     // Alternative configurations for other providers:
    
//     // Gmail configuration
//     /*
//     this.transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASSWORD
//       }
//     });
//     */
      
//     // SendGrid configuration
//     /*
//     this.transporter = nodemailer.createTransport({
//       host: 'smtp.sendgrid.net',
//       port: 587,
//       secure: false,
//       auth: {
//         user: 'apikey',
//         pass: process.env.SENDGRID_API_KEY
//       }
//     });
//     */

//     this.fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
//     this.companyName = process.env.COMPANY_NAME || 'Startup Competition Team';
    
//     console.log('EmailService initialized');
//     console.log('From email:', this.fromEmail);
//   }

//   async sendEmail(to, subject, htmlContent, textContent = null) {
//     try {
//       const mailOptions = {
//         from: {
//           name: this.companyName,
//           address: this.fromEmail
//         },
//         to: to,
//         subject: subject,
//         html: htmlContent,
//         text: textContent || this.stripHtml(htmlContent)
//       };

//       console.log(`Sending email to: ${to}`);
//       console.log(`Subject: ${subject}`);
      
//       const result = await this.transporter.sendMail(mailOptions);
      
//       console.log('Email sent successfully:', result.messageId);
//       return {
//         success: true,
//         messageId: result.messageId,
//         recipient: to
//       };
      
//     } catch (error) {
//       console.error('Email sending failed:', error.message);
//       return {
//         success: false,
//         error: error.message
//       };
//     }
//   }

//   stripHtml(html) {
//     return html.replace(/<[^>]*>/g, '').replace(/\n\s*\n/g, '\n').trim();
//   }

//   generateApprovalEmailTemplate(rowData) {
//     const companyName = rowData['Startup Name'] || 'Your Startup';
//     const contactPerson = rowData['Contact Person'] || 'Dear Applicant';
//     const category = rowData['Category'] || 'startup';

//     return {
//       subject: `🎉 Congratulations! Your ${category} application has been approved`,
//       html: `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <meta charset="UTF-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Application Approved</title>
//         </head>
//         <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
//           <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
//             <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
//             <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Your application has been approved</p>
//           </div>
          
//           <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0;">
//             <h2 style="color: #2c3e50; margin-bottom: 20px;">Dear ${contactPerson},</h2>
            
//             <p style="font-size: 16px; margin-bottom: 20px;">
//               We are thrilled to inform you that your startup application for <strong>${companyName}</strong> 
//               has been <span style="color: #27ae60; font-weight: bold;">APPROVED</span> for our startup competition program!
//             </p>
            
//             <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
//               <h3 style="color: #2c3e50; margin-top: 0;">Application Details:</h3>
//               <ul style="list-style: none; padding: 0;">
//                 <li style="margin: 8px 0;"><strong>Company:</strong> ${companyName}</li>
//                 <li style="margin: 8px 0;"><strong>Category:</strong> ${category}</li>
//                 <li style="margin: 8px 0;"><strong>Contact Person:</strong> ${contactPerson}</li>
//                 ${rowData['Country'] ? `<li style="margin: 8px 0;"><strong>Country:</strong> ${rowData['Country']}</li>` : ''}
//                 ${rowData['City'] ? `<li style="margin: 8px 0;"><strong>City:</strong> ${rowData['City']}</li>` : ''}
//               </ul>
//             </div>
            
//             <h3 style="color: #2c3e50;">What's Next?</h3>
//             <ul style="padding-left: 20px;">
//               <li style="margin: 10px 0;">You will receive detailed information about the next steps within 48 hours</li>
//               <li style="margin: 10px 0;">Our team will contact you to schedule an onboarding session</li>
//               <li style="margin: 10px 0;">Please prepare your pitch presentation and business documentation</li>
//               <li style="margin: 10px 0;">Join our exclusive participant community platform</li>
//             </ul>
            
//             <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #27ae60;">
//               <p style="margin: 0; font-weight: bold; color: #27ae60;">
//                 🚀 Welcome to our startup ecosystem! We're excited to support your journey to success.
//               </p>
//             </div>
            
//             <p style="margin-bottom: 30px;">
//               If you have any questions or need immediate assistance, please don't hesitate to contact us at 
//               <a href="mailto:${this.fromEmail}" style="color: #667eea;">${this.fromEmail}</a>
//             </p>
            
//             <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
//               <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
//                 Best regards,<br>
//                 <strong>${this.companyName}</strong>
//               </p>
//             </div>
//           </div>
          
//           <div style="background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
//             <p style="margin: 0; font-size: 12px;">
//               This is an automated notification. Please do not reply to this email.
//             </p>
//           </div>
//         </body>
//         </html>
//       `
//     };
//   }

//   generateRejectionEmailTemplate(rowData) {
//     const companyName = rowData['Startup Name'] || 'Your Startup';
//     const contactPerson = rowData['Contact Person'] || 'Dear Applicant';
//     const category = rowData['Category'] || 'startup';

//     return {
//       subject: `Update on your ${category} application - ${companyName}`,
//       html: `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <meta charset="UTF-8">
//           <meta name="viewport" content="width=device-width, initial-scale=1.0">
//           <title>Application Update</title>
//         </head>
//         <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
//           <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
//             <h1 style="color: white; margin: 0; font-size: 28px;">Application Update</h1>
//             <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Thank you for your interest</p>
//           </div>
          
//           <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0;">
//             <h2 style="color: #2c3e50; margin-bottom: 20px;">Dear ${contactPerson},</h2>
            
//             <p style="font-size: 16px; margin-bottom: 20px;">
//               Thank you for taking the time to apply to our startup competition program with <strong>${companyName}</strong>. 
//               We appreciate your interest and the effort you put into your application.
//             </p>
            
//             <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
//               <h3 style="color: #2c3e50; margin-top: 0;">Application Details:</h3>
//               <ul style="list-style: none; padding: 0;">
//                 <li style="margin: 8px 0;"><strong>Company:</strong> ${companyName}</li>
//                 <li style="margin: 8px 0;"><strong>Category:</strong> ${category}</li>
//                 <li style="margin: 8px 0;"><strong>Contact Person:</strong> ${contactPerson}</li>
//                 ${rowData['Country'] ? `<li style="margin: 8px 0;"><strong>Country:</strong> ${rowData['Country']}</li>` : ''}
//                 ${rowData['City'] ? `<li style="margin: 8px 0;"><strong>City:</strong> ${rowData['City']}</li>` : ''}
//               </ul>
//             </div>
            
//             <p style="font-size: 16px; margin-bottom: 20px;">
//               After careful consideration and review of all applications, we regret to inform you that we will not be 
//               moving forward with your application at this time. The competition was extremely competitive, and we 
//               had to make difficult decisions with many qualified candidates.
//             </p>
            
//             <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
//               <h3 style="color: #856404; margin-top: 0;">This is not the end of your journey!</h3>
//               <p style="margin-bottom: 10px; color: #856404;">We encourage you to:</p>
//               <ul style="color: #856404; padding-left: 20px;">
//                 <li style="margin: 8px 0;">Continue developing your startup and building your product</li>
//                 <li style="margin: 8px 0;">Apply for our future program cycles</li>
//                 <li style="margin: 8px 0;">Attend our public events and networking sessions</li>
//                 <li style="margin: 8px 0;">Follow us for updates on other opportunities</li>
//               </ul>
//             </div>
            
//             <h3 style="color: #2c3e50;">Alternative Resources:</h3>
//             <ul style="padding-left: 20px;">
//               <li style="margin: 10px 0;">Check out our online resources and guides</li>
//               <li style="margin: 10px 0;">Join our community newsletter for startup tips</li>
//               <li style="margin: 10px 0;">Attend our monthly networking events</li>
//               <li style="margin: 10px 0;">Connect with other entrepreneurs in our ecosystem</li>
//             </ul>
            
//             <p style="margin-bottom: 30px;">
//               We truly appreciate your interest in our program and wish you all the best in your entrepreneurial journey. 
//               If you have any questions, please feel free to contact us at 
//               <a href="mailto:${this.fromEmail}" style="color: #667eea;">${this.fromEmail}</a>
//             </p>
            
//             <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
//               <p style="color: #7f8c8d; font-size: 14px; margin: 0;">
//                 Best regards,<br>
//                 <strong>${this.companyName}</strong>
//               </p>
//             </div>
//           </div>
          
//           <div style="background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
//             <p style="margin: 0; font-size: 12px;">
//               This is an automated notification. Please do not reply to this email.
//             </p>
//           </div>
//         </body>
//         </html>
//       `
//     };
//   }

//   async sendApprovalEmail(rowData) {
//     try {
//       console.log('Generating approval email template...');
//       const template = this.generateApprovalEmailTemplate(rowData);
      
//       const result = await this.sendEmail(
//         rowData.Email,
//         template.subject,
//         template.html
//       );
      
//       return result;
//     } catch (error) {
//       console.error('Error sending approval email:', error.message);
//       return {
//         success: false,
//         error: error.message
//       };
//     }
//   }

//   async sendRejectionEmail(rowData) {
//     try {
//       console.log('Generating rejection email template...');
//       const template = this.generateRejectionEmailTemplate(rowData);
      
//       const result = await this.sendEmail(
//         rowData.Email,
//         template.subject,
//         template.html
//       );
      
//       return result;
//     } catch (error) {
//       console.error('Error sending rejection email:', error.message);
//       return {
//         success: false,
//         error: error.message
//       };
//     }
//   }

//   async testEmailConnection() {
//     try {
//       await this.transporter.verify();
//       console.log('Email service connection verified successfully');
//       return { success: true };
//     } catch (error) {
//       console.error('Email service connection failed:', error.message);
//       return { success: false, error: error.message };
//     }
//   }
// }

// const emailService = new EmailService();

// module.exports = {
//   sendApprovalEmail: async (rowData) => {
//     return await emailService.sendApprovalEmail(rowData);
//   },
  
//   sendRejectionEmail: async (rowData) => {
//     return await emailService.sendRejectionEmail(rowData);
//   },
  
//   testEmailConnection: async () => {
//     return await emailService.testEmailConnection();
//   }
// };