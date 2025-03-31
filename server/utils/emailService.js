const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Send email
  async sendEmail(options) {
    try {
      const message = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        html: options.html
      };

      const info = await this.transporter.sendMail(message);
      console.log('Email sent: %s', info.messageId);
      return info;
    } catch (error) {
      console.error('Email error:', error);
      throw new Error('Email could not be sent');
    }
  }

  // Welcome email
  async sendWelcomeEmail(user) {
    const html = `
      <h1>Welcome to Cricket Tournament Manager!</h1>
      <p>Dear ${user.username},</p>
      <p>Thank you for registering with us. We're excited to have you on board!</p>
      <p>Your account has been successfully created with the role of ${user.role}.</p>
      <p>You can now log in to your account and start using our services.</p>
      <p>Best regards,<br>Cricket Tournament Manager Team</p>
    `;

    await this.sendEmail({
      email: user.email,
      subject: 'Welcome to Cricket Tournament Manager',
      html
    });
  }

  // Password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const html = `
      <h1>Password Reset Request</h1>
      <p>Dear ${user.username},</p>
      <p>You have requested to reset your password. Please click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Best regards,<br>Cricket Tournament Manager Team</p>
    `;

    await this.sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      html
    });
  }

  // Match schedule notification
  async sendMatchScheduleNotification(match, recipients) {
    const html = `
      <h1>Match Schedule Notification</h1>
      <h2>${match.teams.team1.name} vs ${match.teams.team2.name}</h2>
      <p>Date: ${match.schedule.startDate.toLocaleDateString()}</p>
      <p>Time: ${match.schedule.startDate.toLocaleTimeString()}</p>
      <p>Venue: ${match.venue.ground}, ${match.venue.city}</p>
      <p>Match Type: ${match.matchType}</p>
      <p>Best regards,<br>Cricket Tournament Manager Team</p>
    `;

    for (const recipient of recipients) {
      await this.sendEmail({
        email: recipient.email,
        subject: 'Match Schedule Notification',
        html
      });
    }
  }

  // Match result notification
  async sendMatchResultNotification(match, recipients) {
    const html = `
      <h1>Match Result</h1>
      <h2>${match.teams.team1.name} vs ${match.teams.team2.name}</h2>
      <p>Result: ${match.result.description}</p>
      <p>Winner: ${match.result.winner.name}</p>
      <p>Margin: ${match.result.winningMargin} ${match.result.winningType}</p>
      <h3>Match Summary:</h3>
      ${match.innings.map(innings => `
        <p>${innings.team.name}: ${innings.totalRuns}/${innings.wickets} (${innings.overs} overs)</p>
      `).join('')}
      <p>Best regards,<br>Cricket Tournament Manager Team</p>
    `;

    for (const recipient of recipients) {
      await this.sendEmail({
        email: recipient.email,
        subject: 'Match Result Notification',
        html
      });
    }
  }

  // Tournament registration confirmation
  async sendTournamentRegistrationEmail(team, tournament) {
    const html = `
      <h1>Tournament Registration Confirmation</h1>
      <p>Dear ${team.manager.name},</p>
      <p>Your team "${team.name}" has been successfully registered for ${tournament.name}.</p>
      <p>Tournament Details:</p>
      <ul>
        <li>Start Date: ${tournament.startDate.toLocaleDateString()}</li>
        <li>End Date: ${tournament.endDate.toLocaleDateString()}</li>
        <li>Format: ${tournament.format}</li>
      </ul>
      <p>Please ensure all player details are up to date before the tournament begins.</p>
      <p>Best regards,<br>Cricket Tournament Manager Team</p>
    `;

    await this.sendEmail({
      email: team.manager.contact,
      subject: `Registration Confirmation - ${tournament.name}`,
      html
    });
  }

  // Team update notification
  async sendTeamUpdateNotification(team, updateType, details) {
    const html = `
      <h1>Team Update Notification</h1>
      <p>Dear ${team.manager.name},</p>
      <p>This is to notify you about the following update to your team "${team.name}":</p>
      <p><strong>${updateType}</strong></p>
      <p>${details}</p>
      <p>Best regards,<br>Cricket Tournament Manager Team</p>
    `;

    await this.sendEmail({
      email: team.manager.contact,
      subject: 'Team Update Notification',
      html
    });
  }
}

module.exports = new EmailService();