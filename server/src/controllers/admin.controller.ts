import { Response } from 'express';
import { validationResult } from 'express-validator';
import User, { UserRole } from '../models/user.model';
import { sendSuccess, sendError, formatValidationErrors } from '../utils/response.util';
import { AuthRequest } from '../middleware/auth.middleware';
import { auditLogService } from '../services/audit-log.service';
import { normalizeTechPackPermissionsForUser } from '../utils/techpack-permission-normalizer.util';

class AdminController {
  constructor() {
    this.getAllUsers = this.getAllUsers.bind(this);
    this.getUserById = this.getUserById.bind(this);
    this.createUser = this.createUser.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.deleteUser = this.deleteUser.bind(this);
    this.updateUserRole = this.updateUserRole.bind(this);
    this.resetUserPassword = this.resetUserPassword.bind(this);
    this.getUserStats = this.getUserStats.bind(this);
    this.updateUserTwoFactor = this.updateUserTwoFactor.bind(this);
  }

  async getAllUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        role = '', 
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build search query
      const searchQuery: any = {};
      if (search) {
        searchQuery.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }
      if (role) {
        searchQuery.role = role;
      }

      // Build sort object
      const sortObj: any = {};
      sortObj[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      const [users, total] = await Promise.all([
        User.find(searchQuery)
          .select('-password -refreshTokens')
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        User.countDocuments(searchQuery)
      ]);

      const totalPages = Math.ceil(total / limitNum);

      sendSuccess(res, {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      });
    } catch (error: any) {
      console.error('Get all users error:', error);
      sendError(res, 'Failed to retrieve users');
    }
  }

  async getUserById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const user = await User.findById(id).select('-password -refreshTokens').lean();
      if (!user) {
        return sendError(res, 'User not found', 404, 'NOT_FOUND');
      }

      sendSuccess(res, { user });
    } catch (error: any) {
      console.error('Get user by ID error:', error);
      sendError(res, 'Failed to retrieve user');
    }
  }

  async createUser(req: AuthRequest, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
    }

    try {
      const { firstName, lastName, email, password, role } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendError(res, 'User with this email already exists', 409, 'CONFLICT');
      }

      const safeRole = Object.values(UserRole).includes(role) ? role : UserRole.Designer;
      const newUser = new User({
        firstName,
        lastName,
        email,
        password,
        role: safeRole
      });

      await newUser.save();

      const userResponse = newUser.toObject();
      delete (userResponse as any).password;
      delete (userResponse as any).refreshTokens;

      // Log admin action
      // Best-effort audit log; do not fail user creation if logging fails
      await auditLogService.log({
        user: (req.user as any) ?? { _id: newUser._id, email: 'system@local' },
        action: 'CREATE_USER',
        resource: 'user',
        resourceId: newUser._id.toString(),
        details: { email, role, firstName, lastName },
        req
      });

      sendSuccess(res, { user: userResponse }, 'User created successfully', 201);
    } catch (error: any) {
      console.error('Create user error:', error);
      sendError(res, 'Failed to create user');
    }
  }

  async updateUser(req: AuthRequest, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
    }

    try {
      const { id } = req.params;
      const { firstName, lastName, email, role } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return sendError(res, 'User not found', 404, 'NOT_FOUND');
      }

      // Check if email is being changed and if it's already taken
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return sendError(res, 'Email already in use', 409, 'CONFLICT');
        }
      }

      // Store old role before update
      const oldRole = user.role;
      const roleChanged = role && role !== oldRole;

      // Update user fields
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (email) user.email = email;
      if (role) {
        if (!Object.values(UserRole).includes(role)) {
          return sendError(res, 'Invalid role provided', 400, 'VALIDATION_ERROR');
        }
        user.role = role;
      }

      await user.save();

      const userResponse = user.toObject();
      delete (userResponse as any).password;
      delete (userResponse as any).refreshTokens;

      // Normalize TechPack permissions if role changed
      if (roleChanged && role) {
        // Run normalization asynchronously (don't block response)
        normalizeTechPackPermissionsForUser(user._id, role, oldRole)
          .then((result) => {
            console.log(`[AdminController] Normalized TechPack permissions for user ${user._id}`, result);
          })
          .catch((error) => {
            console.error(`[AdminController] Error normalizing TechPack permissions for user ${user._id}:`, error);
            // Don't fail the request if normalization fails
          });
      }

      // Log admin action
      await auditLogService.log({
        user: req.user!,
        action: 'UPDATE_USER',
        resource: 'user',
        resourceId: user._id.toString(),
        details: {
          updatedFields: { firstName, lastName, email, role },
          previousEmail: user.email,
          roleChanged,
          oldRole: roleChanged ? oldRole : undefined,
          newRole: roleChanged ? role : undefined,
        },
        req
      });

      sendSuccess(res, { user: userResponse }, 'User updated successfully');
    } catch (error: any) {
      console.error('Update user error:', error);
      sendError(res, 'Failed to update user');
    }
  }

  async updateUserTwoFactor(req: AuthRequest, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
    }

    try {
      const { id } = req.params;
      const { enabled } = req.body as { enabled: boolean };

      const user = await User.findById(id).select('+twoFactorCode');
      if (!user) {
        return sendError(res, 'User not found', 404, 'NOT_FOUND');
      }

      user.is2FAEnabled = enabled;

      if (!enabled) {
        delete user.twoFactorCode;
        delete user.twoFactorCodeExpires;
        user.twoFactorCodeAttempts = 0;
      } else {
        user.twoFactorCodeAttempts = 0;
      }

      await user.save();

      await auditLogService.log({
        user: req.user!,
        action: 'UPDATE_USER_2FA',
        resource: 'user',
        resourceId: user._id.toString(),
        details: {
          enabled,
          targetUser: user.email
        },
        req
      });

      sendSuccess(res, { is2FAEnabled: enabled }, 'User 2FA setting updated successfully');
    } catch (error: any) {
      console.error('Update user 2FA error:', error);
      sendError(res, 'Failed to update user 2FA setting');
    }
  }

  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (id === req.user?._id.toString()) {
        return sendError(res, 'Cannot delete your own account', 400, 'BAD_REQUEST');
      }

      const user = await User.findById(id);
      if (!user) {
        return sendError(res, 'User not found', 404, 'NOT_FOUND');
      }

      await User.findByIdAndDelete(id);

      // Log admin action
      await auditLogService.log({
        user: req.user!,
        action: 'DELETE_USER',
        resource: 'user',
        resourceId: user._id.toString(),
        details: {
          deletedUser: {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        },
        req
      });

      sendSuccess(res, {}, 'User deleted successfully');
    } catch (error: any) {
      console.error('Delete user error:', error);
      sendError(res, 'Failed to delete user');
    }
  }

  async updateUserRole(req: AuthRequest, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
    }

    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!Object.values(UserRole).includes(role)) {
        return sendError(res, 'Invalid role provided', 400, 'VALIDATION_ERROR');
      }

      const user = await User.findById(id);
      if (!user) {
        return sendError(res, 'User not found', 404, 'NOT_FOUND');
      }

      const oldRole = user.role;
      const roleChanged = role !== oldRole;
      
      user.role = role;
      await user.save();

      // Normalize TechPack permissions if role changed
      if (roleChanged) {
        // Run normalization asynchronously (don't block response)
        normalizeTechPackPermissionsForUser(user._id, role, oldRole)
          .then((result) => {
            console.log(`[AdminController] Normalized TechPack permissions for user ${user._id}`, result);
          })
          .catch((error) => {
            console.error(`[AdminController] Error normalizing TechPack permissions for user ${user._id}:`, error);
            // Don't fail the request if normalization fails
          });
      }

      // Log admin action
      await auditLogService.log({
        user: req.user!,
        action: 'CHANGE_ROLE',
        resource: 'user',
        resourceId: user._id.toString(),
        details: {
          previousRole: oldRole,
          newRole: role,
          targetUser: user.email
        },
        req
      });

      sendSuccess(res, { role }, 'User role updated successfully');
    } catch (error: any) {
      console.error('Update user role error:', error);
      sendError(res, 'Failed to update user role');
    }
  }

  async resetUserPassword(req: AuthRequest, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', formatValidationErrors(errors.array()));
    }

    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return sendError(res, 'User not found', 404, 'NOT_FOUND');
      }

      user.password = newPassword;
      user.refreshTokens = []; // Invalidate all refresh tokens
      await user.save();

      // Log admin action
      await auditLogService.log({
        user: req.user!,
        action: 'RESET_PASSWORD',
        resource: 'user',
        resourceId: user._id.toString(),
        details: {
          targetUser: user.email
        },
        req
      });

      sendSuccess(res, {}, 'Password reset successfully');
    } catch (error: any) {
      console.error('Reset password error:', error);
      sendError(res, 'Failed to reset password');
    }
  }

    async getUserStats(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const [totalUsers, roleStats, recentUsers] = await Promise.all([
        User.countDocuments(),
        User.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ]),
        User.find()
          .select('-password -refreshTokens')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      ]);

      const stats = {
        totalUsers,
        roleDistribution: roleStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        recentUsers
      };

      sendSuccess(res, stats);
    } catch (error: any) {
      console.error('Get user stats error:', error);
      sendError(res, 'Failed to retrieve user statistics');
    }
  }
}

export default new AdminController();
