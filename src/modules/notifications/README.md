# Notifications Module (Phase 10 Placeholder)

This module is reserved for Phase 10 (Notifications Domain Module).
It will build user notification preferences, multi-channel dispatch (SMS, WhatsApp, FCM Push), template management, and in-app inbox features on top of platform integration ports (`integrations/email`, `integrations/sms`, `integrations/whatsapp`, `integrations/push`).

System transactional notifications (OTP, invite emails) are handled by the low-level platform facade in `src/core/notifications/`.
