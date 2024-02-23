const express = require('express');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Configure your SMTP settings for nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com', // Your SMTP host
  port: 587, // Your SMTP port
  secure: false, // True for 465, false for other ports
  auth: {
    user: 'your_email@example.com', // Your SMTP username
    pass: 'your_password', // Your SMTP password
  },
});

// Function to create Stripe Express account and send email
async function createAccountAndSendEmail(email) {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email: email,
      capabilities: {
        card_payments: {requested: true},
        transfers: {requested: true},
      },
    });

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://yourwebsite.com/reauth',
      return_url: 'https://yourwebsite.com/return',
      type: 'account_onboarding',
    });

    // Sending the email
    const mailOptions = {
      from: '"Your Name" <your_email@example.com>', // Sender address
      to: email, // List of receivers
      subject: 'Set up your Stripe account', // Subject line
      text: `Please set up your Stripe account by following this link: ${accountLink.url}`, // Plain text body
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}`);
  } catch (error) {
    console.error(`Failed to create account or send email for ${email}:`, error);
    throw error; // Rethrow to handle it in the calling function
  }
}

// Endpoint to receive a list of emails and process them
app.post('/send-invites', async (req, res) => {
  const emails = req.body.emails;
  if (!emails || emails.length === 0) {
    return res.status(400).send({ message: 'No emails provided' });
  }

  try {
    for (const email of emails) {
      await createAccountAndSendEmail(email); // Process each email
    }
    res.send({ message: 'Invitations sent successfully' });
  } catch (error) {
    res.status(500).send({ message: 'An error occurred while sending invitations' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
