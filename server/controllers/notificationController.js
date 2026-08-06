// TODO: Implement email notifications
// Member responsibility: Noorani Faiza Khan (Gmail API)

// @route POST /api/notifications/send-reminder
const sendMealReminder = async (req, res) => {
  try {
    // TODO: Use Gmail API / Nodemailer to send daily meal reminder to user
    res.status(501).json({ message: 'sendMealReminder not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { sendMealReminder };
