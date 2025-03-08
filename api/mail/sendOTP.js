const nodemailer = require('nodemailer')

const sendOTP = async options => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    const mailOptions = {
      priority: 'high',
      from: process.env.SMTP_MAIL,
      to: options.email,
      subject: options.subject,
      text: options.message
    }

    await transporter.sendMail(mailOptions)
  } catch (error) {
    console.log(error)
    throw {
      success: false,
      msg: 'Cannot send OTP... Try again later!'
    }
  }
}

module.exports = sendOTP
