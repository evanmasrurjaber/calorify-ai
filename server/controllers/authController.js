// TODO: Implement register and login controllers
// Member responsibility: Common (all members share auth)

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendEmail } = require('../services/gmailService');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// @route POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, phone, password, age, weight, height } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, phone, password: hashedPassword, age, weight, height });

    // Send registration confirmation email
    const subject = `Welcome to Calorify! 🚀`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <h2 style="color: #10b981; text-align: center; margin-bottom: 20px;">Welcome to Calorify!</h2>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">Thank you for registering at Calorify, your all-in-one AI-powered nutrition and habit tracking application!</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">Here is what you can do next:</p>
        <ul style="font-size: 15px; color: #334155; line-height: 1.6; padding-left: 20px;">
          <li><strong>Generate a personalized 7-day meal plan</strong> customized to your TDEE and health requirements.</li>
          <li><strong>Use the AI Food Scanner</strong> to instantly calculate calories and macros from your meal photos or descriptions.</li>
          <li><strong>Complete Daily Habit Challenges</strong> to earn points and collect unique milestones and badges!</li>
        </ul>
        <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-top: 25px;">We are excited to help you along your health journey!</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-top: 30px;">Best regards,<br/><strong>The Calorify Team</strong></p>
      </div>
    `;
    sendEmail(email, subject, html).catch(err => console.log('Error sending registration confirmation email:', err.message));

    res.status(201).json({ token: generateToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Send new user login email alert asynchronously
    if (user.notifications?.loginAlerts !== false) {
      const loginTime = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Dhaka',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const subject = `🔐 Security Alert: New Login to your Calorify Account`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <h2 style="color: #10b981; text-align: center; margin-bottom: 20px;">🔐 New Login Detected</h2>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">We detected a successful login to your Calorify account on <strong>${loginTime} (Local Time)</strong>.</p>
          <div style="background-color: #f8fafc; padding: 18px; border-radius: 16px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #334155; font-size: 14px;"><strong>Account:</strong> ${user.email}</p>
            <p style="margin: 6px 0 0 0; color: #64748b; font-size: 13px;">If this was you, no action is needed.</p>
          </div>
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.6;">You can manage your email notification preferences anytime from your Profile settings.</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-top: 25px;">Best regards,<br/><strong>The Calorify Team</strong></p>
        </div>
      `;
      sendEmail(user.email, subject, html).catch((err) =>
        console.log('[Login Alert Email Failed]:', err.message)
      );
    }

    res.json({ token: generateToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role, isPro: user.isPro } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login };
