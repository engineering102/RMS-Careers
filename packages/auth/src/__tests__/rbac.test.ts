import { describe, it, expect } from 'vitest';
import {
  hasRole,
  hasAdminPrivileges,
  assertRole,
  assertAdminPrivileges,
  AuthorizationError,
  ADMIN_ROLES,
  normalizeRoles
} from '../rbac';

describe('@rms/auth — RBAC Security Primitives', () => {
  describe('ADMIN_ROLES', () => {
    it('should define super_admin and admin as authoritative admin roles', () => {
      expect(ADMIN_ROLES).toContain('admin');
      expect(ADMIN_ROLES).toContain('super_admin');
      expect(ADMIN_ROLES.length).toBe(2);
    });
  });

  describe('normalizeRoles', () => {
    it('should normalize single string roles', () => {
      expect(normalizeRoles('ADMIN')).toEqual(['admin']);
      expect(normalizeRoles('  super_admin  ')).toEqual(['super_admin']);
    });

    it('should normalize string array roles', () => {
      expect(normalizeRoles(['admin', 'student'])).toEqual(['admin', 'student']);
    });

    it('should normalize array of relation objects with role property', () => {
      const objects = [{ role: 'super_admin' }, { role: 'admin' }];
      expect(normalizeRoles(objects)).toEqual(['super_admin', 'admin']);
    });

    it('should return empty array for null, undefined, or empty inputs', () => {
      expect(normalizeRoles(null)).toEqual([]);
      expect(normalizeRoles(undefined)).toEqual([]);
      expect(normalizeRoles([])).toEqual([]);
    });
  });

  describe('hasRole', () => {
    it('should return true when user holds the exact required role', () => {
      expect(hasRole(['student'], 'student')).toBe(true);
      expect(hasRole([{ role: 'tutor' }], 'tutor')).toBe(true);
    });

    it('should return true when user holds at least one of multiple permissible roles', () => {
      expect(hasRole(['tutor', 'admin'], ['admin', 'super_admin'])).toBe(true);
      expect(hasRole([{ role: 'student' }, { role: 'admin' }], ['super_admin', 'admin'])).toBe(true);
    });

    it('should return false when user lacks required role', () => {
      expect(hasRole(['student'], 'admin')).toBe(false);
      expect(hasRole([{ role: 'student' }], 'tutor')).toBe(false);
    });

    it('should return false for null, undefined, or empty user roles', () => {
      expect(hasRole(null, 'admin')).toBe(false);
      expect(hasRole(undefined, 'admin')).toBe(false);
      expect(hasRole([], 'admin')).toBe(false);
    });
  });

  describe('hasAdminPrivileges', () => {
    it('should return true for admin or super_admin', () => {
      expect(hasAdminPrivileges('admin')).toBe(true);
      expect(hasAdminPrivileges('super_admin')).toBe(true);
      expect(hasAdminPrivileges(['admin'])).toBe(true);
      expect(hasAdminPrivileges([{ role: 'super_admin' }])).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(hasAdminPrivileges('student')).toBe(false);
      expect(hasAdminPrivileges('tutor')).toBe(false);
      expect(hasAdminPrivileges(['student', 'tutor'])).toBe(false);
      expect(hasAdminPrivileges(null)).toBe(false);
      expect(hasAdminPrivileges([])).toBe(false);
    });
  });

  describe('assertRole', () => {
    it('should not throw when role assertion passes', () => {
      expect(() => assertRole(['admin'], 'admin')).not.toThrow();
      expect(() => assertRole([{ role: 'super_admin' }], ['super_admin', 'admin'])).not.toThrow();
    });

    it('should throw AuthorizationError when role assertion fails', () => {
      expect(() => assertRole(['student'], 'admin')).toThrow(AuthorizationError);
      expect(() => assertRole(null, 'admin')).toThrow(AuthorizationError);
    });

    it('should support custom error messages', () => {
      expect(() => assertRole(['student'], 'admin', 'Custom forbidden error')).toThrow(
        'Custom forbidden error'
      );
    });
  });

  describe('assertAdminPrivileges', () => {
    it('should not throw for admin or super_admin', () => {
      expect(() => assertAdminPrivileges('admin')).not.toThrow();
      expect(() => assertAdminPrivileges([{ role: 'super_admin' }])).not.toThrow();
    });

    it('should throw AuthorizationError for unauthorized roles', () => {
      expect(() => assertAdminPrivileges('student')).toThrow(AuthorizationError);
      expect(() => assertAdminPrivileges(null)).toThrow(AuthorizationError);
      expect(() => assertAdminPrivileges([])).toThrow(AuthorizationError);
    });
  });
});
