import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../config/db.js';
import { ApiError } from '../../utils/ApiError.js';

const signToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

export const login = async ({ email, password }) => {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const { password: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    token: signToken(user),
  };
};

export const register = async ({ name, email, password, role }) => {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, 'Email already registered');
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role ?? 'CASHIER',
    },
  });

  const { password: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    token: signToken(user),
  };
};
