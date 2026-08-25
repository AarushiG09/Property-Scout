import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  
  const { mailOptions, GMAIL_USER, GMAIL_PASS } = req.body;
  
  if (!GMAIL_USER || !GMAIL_PASS) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER.trim(),
      pass: GMAIL_PASS.replace(/\s+/g, "")
    }
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
