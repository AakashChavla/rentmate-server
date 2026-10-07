// Generated with yarn i18n:types. Do not edit.
import catalog0en from '../../../i18n/en/common.json';
import catalog1en from '../../../i18n/en/emails.json';
import catalog2en from '../../../i18n/en/errors.json';
import catalog3en from '../../../i18n/en/validation.json';
import catalog0hi from '../../../i18n/hi/common.json';
import catalog1hi from '../../../i18n/hi/emails.json';
import catalog2hi from '../../../i18n/hi/errors.json';
import catalog3hi from '../../../i18n/hi/validation.json';
export type I18nTranslations = {
  common: typeof catalog0en;
  emails: typeof catalog1en;
  errors: typeof catalog2en;
  validation: typeof catalog3en;
};
export type I18nKey =
  | 'common.healthLive'
  | 'emails.auth.subject'
  | 'emails.auth.otp'
  | 'emails.auth.accountExists'
  | 'emails.auth.passwordReset'
  | 'emails.invite.subject'
  | 'emails.invite.body'
  | 'errors.VALIDATION_ERROR'
  | 'errors.UNAUTHORIZED'
  | 'errors.FORBIDDEN'
  | 'errors.NOT_FOUND'
  | 'errors.CONFLICT'
  | 'errors.RATE_LIMITED'
  | 'errors.INTERNAL_ERROR'
  | 'errors.INVALID_CREDENTIALS'
  | 'errors.TOO_MANY_ATTEMPTS'
  | 'errors.ACCOUNT_SUSPENDED'
  | 'errors.SESSION_REVOKED'
  | 'errors.TOKEN_EXPIRED'
  | 'errors.TOKEN_ROTATED'
  | 'errors.OTP_INVALID'
  | 'errors.OTP_EXPIRED'
  | 'errors.OTP_LOCKED'
  | 'errors.WEAK_PASSWORD'
  | 'errors.LAST_OWNER'
  | 'errors.NOT_SUPPORTED_YET'
  | 'errors.CSRF_ORIGIN_MISMATCH'
  | 'errors.INVALID_CURSOR'
  | 'errors.INFRASTRUCTURE_UNAVAILABLE'
  | 'errors.INVALID_PROPERTY_CONFIG'
  | 'errors.INVITE_INVALID'
  | 'errors.INVITE_EXPIRED'
  | 'errors.INVITE_USED'
  | 'errors.INVITE_DUPLICATE'
  | 'errors.illegalUnitTransition'
  | 'errors.staleUnitStatus'
  | 'errors.unitInUse'
  | 'errors.bedNotSupported'
  | 'errors.bedCapacityExceeded'
  | 'errors.duplicateUnitCode'
  | 'errors.invalidUnitConfig'
  | 'errors.LEASE_OVERLAP'
  | 'errors.ILLEGAL_LEASE_TRANSITION'
  | 'errors.TENANT_KYC_REQUIRED'
  | 'errors.DOCUMENT_MIME_INVALID'
  | 'errors.DOCUMENT_TOO_LARGE'
  | 'errors.DOCUMENT_URL_EXPIRED'
  | 'validation.invalid';
