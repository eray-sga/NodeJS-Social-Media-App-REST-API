const nodeMailer = require("nodemailer")

exports.sendEmail = async(options) => {

    const transporer = nodeMailer.createTransport({

        host: process.env.SMTP_HOST,
        port:  process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            password: process.env.SMTP_PASSWORD
        },
        service: process.env.SMTP_SERVICE
    })

    const mailOptions = {
        from: "",
        to: options.email,
        subject: options.subject,
        text: options.message
    }

    await transporer.sendMail(mailOptions)
}