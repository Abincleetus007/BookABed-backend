const express = require('express');
const Booking = require('../models/bookingModel');
const router = express.Router();
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_KEY);

// Route to create a Stripe Checkout session
router.post('/create-checkout-session', async (req, res) => {
  const body = req.body;

  // Basic validation
  if (!body.travelerPricings || !body.itineraries || !body.user) {
    return res.status(400).json({ success: false, message: 'Invalid booking data' });
  }

  // Create a new Booking document
  const booking = new Booking({
    totalAmount: Number(body.travelerPricings[0].price.total), // fixed typo and ensure number
    from: body.itineraries[0].segments[0].departure.iataCode,
    to: body.itineraries[0].segments[0].arrival.iataCode,
    departureTime: body.itineraries[0].segments[0].departure.at,
    arrivalTime: body.itineraries[0].segments[0].arrival.at,
    duration: body.itineraries[0].duration,
    orderedBy: body.user.firstName,
    userId: body.user.userId
  });

  try {
    await booking.save();
    const price = booking.totalAmount;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: 'Flights' },
          unit_amount: price * 100, // smallest currency unit
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: 'https://book-a-bed.vercel.app/paymentSuccess',
      cancel_url: 'https://book-a-bed.vercel.app/',
      metadata: { bookingId: booking._id.toString() }
    });

    res.json({ status: true, id: session.id });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

module.exports = router;
