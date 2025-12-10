// Server/utils/emailService.js
const nodemailer = require('nodemailer');

// Create transporter - FIXED
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false // Only for development
    }
  });
};

const transporter = createTransporter();

// Verify connection
const verifyConnection = async () => {
  try {
    await transporter.verify();
    console.log('✓ Email service is ready');
  } catch (error) {
    console.error('✗ Email service error:', error.message);
  }
};

// Call verify on module load
verifyConnection();

/**
 * Send invitation email
 */
const sendInvitationEmail = async ({ email, registrationUrl, role, adminName }) => {
  const roleDescriptions = {
    admin: 'Full system access with administrative privileges',
    adjudicator: 'Review and approve user applications',
    viewer: 'Read-only access to view data'
  };

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Invitation to MSME Awards Platform',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
          }
          .badge {
            display: inline-block;
            padding: 5px 15px;
            background: #ffc107;
            color: #333;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">MSME Awards Platform</h1>
            <p style="margin: 10px 0 0 0;">You've Been Invited!</p>
          </div>
          
          <div class="content">
            <h2>Hello!</h2>
            
            <p><strong>${adminName}</strong> has invited you to join the <strong>MSME Awards Platform</strong>.</p>
            
            <p>You have been assigned the role: <span class="badge">${role}</span></p>
            
            <p><em>${roleDescriptions[role]}</em></p>
            
            <p>Click the button below to complete your registration:</p>
            
            <div style="text-align: center;">
              <a href="${registrationUrl}" class="button">Register Now</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Or copy this link: <br/>
              <a href="${registrationUrl}" style="color: #667eea; word-break: break-all;">${registrationUrl}</a>
            </p>
            
            <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-top: 20px;">
              <strong>Important:</strong> This invitation link will expire in 24 hours for security reasons.
            </div>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Presidential MSME Awards</p>
            <p>If you did not expect this invitation, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
You've Been Invited to MSME Awards Platform

${adminName} has invited you to join the MSME Awards Platform as a ${role}.

${roleDescriptions[role]}

Complete your registration by visiting:
${registrationUrl}

This link will expire in 24 hours.

© ${new Date().getFullYear()} Presidential MSME Awards
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully. Message ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send application approval email
 */
const sendApplicationApprovalEmail = async ({ email, applicantName, companyName }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Congratulations! Your MSME Award Application Has Been Approved',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .badge { display: inline-block; padding: 8px 20px; background: #28a745; color: white; border-radius: 20px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">MSME Awards Platform</h1>
            <p style="margin: 10px 0 0 0;">Application Approved</p>
          </div>
          
          <div class="content">
            <h2>Congratulations ${applicantName}!</h2>
            
            <p>We are pleased to inform you that your application for <strong>${companyName}</strong> has been <span class="badge">APPROVED</span> by our review panel.</p>
            
            <p>Your application has successfully passed our comprehensive evaluation process. Our adjudicators have reviewed your submission and found it meets all the required criteria.</p>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>You will receive further instructions via email within 3-5 business days</li>
              <li>Please keep this email for your records</li>
              <li>Our team may contact you for additional information if needed</li>
            </ol>
            
            <p>Thank you for your participation in the Presidential MSME Awards program.</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Presidential MSME Awards</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Congratulations ${applicantName}!

Your application for ${companyName} has been APPROVED.

Your application has successfully passed our comprehensive evaluation process.

Next Steps:
1. You will receive further instructions via email within 3-5 business days
2. Please keep this email for your records
3. Our team may contact you for additional information if needed

Thank you for your participation.

© ${new Date().getFullYear()} Presidential MSME Awards
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Approval email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending approval email:', error);
    throw error;
  }
};

/**
 * Send application rejection email
 */
const sendApplicationRejectionEmail = async ({ email, applicantName, companyName, reason }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'MSME Award Application Status Update',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .info-box { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">MSME Awards Platform</h1>
            <p style="margin: 10px 0 0 0;">Application Status Update</p>
          </div>
          
          <div class="content">
            <h2>Dear ${applicantName},</h2>
            
            <p>Thank you for your interest in the Presidential MSME Awards and for submitting your application for <strong>${companyName}</strong>.</p>
            
            <p>After careful consideration by our review panel, we regret to inform you that your application has not been selected to move forward at this time.</p>
            
            ${reason ? `
            <div class="info-box">
              <strong>Feedback:</strong>
              <p style="margin: 10px 0 0 0;">${reason}</p>
            </div>
            ` : ''}
            
            <p>We appreciate the time and effort you invested in your application. We encourage you to:</p>
            <ul>
              <li>Review the feedback provided</li>
              <li>Consider applying in future award cycles</li>
              <li>Continue to develop and grow your business</li>
            </ul>
            
            <p>Thank you again for your participation. We wish you continued success in your business endeavors.</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Presidential MSME Awards</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Dear ${applicantName},

Thank you for submitting your application for ${companyName}.

After careful consideration, we regret to inform you that your application has not been selected to move forward at this time.

${reason ? `Feedback: ${reason}` : ''}

We encourage you to consider applying in future award cycles.

Thank you for your participation.

© ${new Date().getFullYear()} Presidential MSME Awards
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Rejection email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending rejection email:', error);
    throw error;
  }
};


/**
 * Send account approval notification to user
 */
const sendUserApprovalNotification = async ({ userEmail, userName, userRole }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: 'Your MSME Awards Account Has Been Approved!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 15px 40px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px; }
          .success-icon { width: 80px; height: 80px; margin: 0 auto 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">MSME Awards Platform</h1>
            <p style="margin: 10px 0 0 0;">Account Approved!</p>
          </div>
          
          <div class="content">
            <div style="text-align: center;">
              <div style="width: 80px; height: 80px; background: #28a745; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 40px;">✓</span>
              </div>
            </div>

            <h2 style="text-align: center; color: #28a745;">Congratulations ${userName}!</h2>
            
            <p>We're pleased to inform you that your account on the MSME Awards Platform has been approved by an administrator.</p>
            
            <div style="background: #d4edda; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin-top: 0; color: #155724;">Your Account Details:</h3>
              <p style="margin: 5px 0; color: #155724;"><strong>Email:</strong> ${userEmail}</p>
              <p style="margin: 5px 0; color: #155724;"><strong>Role:</strong> <span style="text-transform: capitalize;">${userRole}</span></p>
              <p style="margin: 5px 0; color: #155724;"><strong>Status:</strong> Active</p>
            </div>
            
            <p><strong>You can now sign in to access the platform!</strong></p>
            
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/auth/login" class="button">Sign In Now</a>
            </div>
            
            <div style="background: #fff; padding: 15px; border: 1px solid #e9ecef; margin-top: 20px; border-radius: 5px;">
              <h4 style="margin-top: 0;">Getting Started:</h4>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Click the "Sign In Now" button above</li>
                <li>Enter your email and password</li>
                <li>Access your dashboard and start using the platform</li>
              </ol>
            </div>

            <p style="margin-top: 20px;">If you have any questions or need assistance, please contact our support team.</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Presidential MSME Awards</p>
            <p>Need help? Contact <a href="mailto:support@msmeawards.com">support@msmeawards.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Account Approved!

Congratulations ${userName}!

Your account on the MSME Awards Platform has been approved.

Account Details:
Email: ${userEmail}
Role: ${userRole}
Status: Active

You can now sign in at: ${process.env.CLIENT_URL}/auth/login

Getting Started:
1. Visit the login page
2. Enter your email and password
3. Access your dashboard

© ${new Date().getFullYear()} Presidential MSME Awards
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('User approval notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending user approval notification:', error);
    throw error;
  }
};



/**
 * Send notification to all admins when a new user registers
 */
const sendAdminNotificationNewUser = async ({ adminEmail, adminName, newUserName, newUserEmail, newUserRole, registrationDate }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: adminEmail,
    subject: 'New User Registration - Approval Required',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold; }
          .info-box { background: #fff; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">MSME Awards Platform</h1>
            <p style="margin: 10px 0 0 0;">New User Registration</p>
          </div>
          
          <div class="content">
            <h2>Hello ${adminName},</h2>
            
            <p>A new user has registered on the MSME Awards Platform and is awaiting approval.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0;">User Details:</h3>
              <p style="margin: 5px 0;"><strong>Name:</strong> ${newUserName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${newUserEmail}</p>
              <p style="margin: 5px 0;"><strong>Requested Role:</strong> <span style="text-transform: capitalize;">${newUserRole}</span></p>
              <p style="margin: 5px 0;"><strong>Registration Date:</strong> ${registrationDate}</p>
            </div>
            
            <p>Please review this application and take appropriate action.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.CLIENT_URL}/users-management" class="button">Review Application</a>
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin-top: 20px;">
              <strong>Action Required:</strong> This user cannot access the system until approved by an administrator.
            </div>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Presidential MSME Awards</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
New User Registration - Approval Required

Hello ${adminName},

A new user has registered and is awaiting approval:

Name: ${newUserName}
Email: ${newUserEmail}
Requested Role: ${newUserRole}
Registration Date: ${registrationDate}

Please review this application in the admin panel.

© ${new Date().getFullYear()} Presidential MSME Awards
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Admin notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending admin notification:', error);
    throw error;
  }
};

/**
 * Approve application - Send notification to user
 */


/**
 * Send account rejection notification to user
 */
const sendUserRejectionNotification = async ({ userEmail, userName, rejectionReason }) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: userEmail,
    subject: 'MSME Awards Account Application Status',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6c757d 0%, #495057 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">MSME Awards Platform</h1>
            <p style="margin: 10px 0 0 0;">Account Application Update</p>
          </div>
          
          <div class="content">
            <h2>Dear ${userName},</h2>
            
            <p>Thank you for your interest in joining the MSME Awards Platform.</p>
            
            <p>After careful review, we regret to inform you that your account application has not been approved at this time.</p>
            
            <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <strong>Feedback:</strong>
              <p style="margin: 10px 0 0 0;">${rejectionReason}</p>
            </div>

            <p>If you believe this decision was made in error or if you have additional information to provide, please contact our support team.</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="mailto:support@msmeawards.com" class="button">Contact Support</a>
            </div>

            <p>We appreciate your interest and wish you well in your future endeavors.</p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Presidential MSME Awards</p>
            <p>Need help? Contact <a href="mailto:support@msmeawards.com">support@msmeawards.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
MSME Awards Platform - Account Application Update

Dear ${userName},

Thank you for your interest in joining the MSME Awards Platform.

After careful review, we regret to inform you that your account application has not been approved at this time.

Feedback: ${rejectionReason}

If you believe this decision was made in error or have additional information, please contact support@msmeawards.com

© ${new Date().getFullYear()} Presidential MSME Awards
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('User rejection notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending user rejection notification:', error);
    throw error;
  }
};

// Update module.exports
module.exports = {
  sendInvitationEmail,
  sendApplicationApprovalEmail,
  sendApplicationRejectionEmail,
  sendAdminNotificationNewUser,
  sendUserApprovalNotification,
  sendUserRejectionNotification
};



