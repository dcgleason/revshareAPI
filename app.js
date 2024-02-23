const express = require('express');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const twilio = require('twilio');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Twilio setup
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Function to create Stripe Express account and send text message
async function createAccountAndSendText(phoneNumber) {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email: 'placeholder@example.com', // Since we're focusing on phone numbers, you might need a placeholder email
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

    // Sending the text message
    const message = await twilioClient.messages.create({
      body: `Please set up your Stripe account by following this link: ${accountLink.url}`,
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
      to: phoneNumber,
    });

    console.log(`Message sent to ${phoneNumber}: ${message.sid}`);
  } catch (error) {
    console.error(`Failed to create account or send text for ${phoneNumber}:`, error);
    throw error; // Rethrow to handle it in the calling function
  }
}

// Endpoint to receive a list of phone numbers and process them
app.post('/send-invites', async (req, res) => {
  const phoneNumbers = req.body.phoneNumbers;
  if (!phoneNumbers || phoneNumbers.length === 0) {
    return res.status(400).send({ message: 'No phone numbers provided' });
  }

  try {
    for (const phoneNumber of phoneNumbers) {
      await createAccountAndSendText(phoneNumber); // Process each phone number
    }
    res.send({ message: 'Invitations sent successfully' });
  } catch (error) {
    res.status(500).send({ message: 'An error occurred while sending invitations' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});