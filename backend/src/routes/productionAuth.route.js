import express from 'express';
import { AppUser } from '../models/master.model.js';

const router = express.Router();

// =============================================================================
// POST /api/auth/login
//
// Body: { email: string, password: string }
//
// Simple credential check — no JWT, no sessions.
// Looks up the user in the AppUser collection (same table as Masters → Users tab).
// Returns { success: true, user: { name, email, role, department } } on match.
//
// NOTE: Passwords are stored in plain text in AppUser (as per existing schema).
//       This is a direct comparison — no bcrypt.
//       If you add password hashing later, update this comparison accordingly.
// =============================================================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // Find user by email (case-insensitive)
    const user = await AppUser.findOne({
      email: { $regex: new RegExp(`^${email.trim()}$`, 'i') },
    }).lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with that email address.',
      });
    }

    // Plain text password comparison (matches existing AppUser schema)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.',
      });
    }

    // Success — return safe user info (never return password)
    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        id:         user._id,
        name:       user.name,
        username:   user.username,
        email:      user.email,
        employeeId: user.employeeId,
        role:       user.role,
        department: user.department,
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
});

export default router;