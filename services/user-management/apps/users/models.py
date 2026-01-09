"""
User models for multi-tenant SaaS platform
Implements custom user model with tenant isolation and advanced features
"""

import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.core.validators import EmailValidator, RegexValidator
from django_tenants.models import TenantMixin, DomainMixin
from phonenumber_field.modelfields import PhoneNumberField
from apps.core.models import TimestampedModel, SoftDeleteModel
from apps.core.managers import TenantAwareManager
from .managers import UserManager


class Tenant(TenantMixin):
    """
    Tenant model for multi-tenancy
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    
    # Tenant Information
    company_name = models.CharField(max_length=255)
    company_email = models.EmailField()
    company_phone = PhoneNumberField(blank=True, null=True)
    company_address = models.TextField(blank=True)
    
    # Subscription & Billing
    subscription_tier = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('starter', 'Starter'),
            ('professional', 'Professional'),
            ('enterprise', 'Enterprise'),
        ],
        default='free'
    )
    subscription_status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('suspended', 'Suspended'),
            ('cancelled', 'Cancelled'),
            ('expired', 'Expired'),
        ],
        default='active'
    )
    subscription_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Limits & Quotas
    max_users = models.IntegerField(default=10)
    max_storage_gb = models.IntegerField(default=10)
    max_api_calls_per_month = models.IntegerField(default=10000)
    
    # Features & Settings
    features = models.JSONField(default=dict, blank=True)
    settings = models.JSONField(default=dict, blank=True)
    
    # Security
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    requires_2fa = models.BooleanField(default=False)
    allowed_ip_ranges = models.JSONField(default=list, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.UUIDField(null=True, blank=True)
    
    # Database routing
    auto_create_schema = True
    auto_drop_schema = False
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return self.name
    
    def is_subscription_active(self):
        """Check if subscription is active and not expired"""
        if self.subscription_status != 'active':
            return False
        if self.subscription_expires_at and self.subscription_expires_at < timezone.now():
            return False
        return True
    
    def get_feature(self, feature_name, default=False):
        """Get feature flag value"""
        return self.features.get(feature_name, default)
    
    def get_setting(self, setting_name, default=None):
        """Get tenant setting value"""
        return self.settings.get(setting_name, default)


class Domain(DomainMixin):
    """
    Domain model for tenant routing
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    is_verified = models.BooleanField(default=False)
    ssl_enabled = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['domain']


class User(AbstractBaseUser, PermissionsMixin, TimestampedModel, SoftDeleteModel):
    """
    Custom user model with multi-tenant support
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Authentication fields
    username_validator = UnicodeUsernameValidator()
    username = models.CharField(
        _('username'),
        max_length=150,
        unique=True,
        help_text=_('Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.'),
        validators=[username_validator],
        error_messages={
            'unique': _("A user with that username already exists."),
        },
    )
    email = models.EmailField(
        _('email address'),
        unique=True,
        validators=[EmailValidator()],
        error_messages={
            'unique': _("A user with that email already exists."),
        },
    )
    
    # Personal Information
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    display_name = models.CharField(max_length=255, blank=True)
    avatar_url = models.URLField(blank=True)
    phone_number = PhoneNumberField(blank=True, null=True)
    
    # Professional Information
    job_title = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, blank=True)
    manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='direct_reports'
    )
    
    # Account Status
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into this admin site.'),
    )
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    is_verified = models.BooleanField(default=False)
    is_tenant_admin = models.BooleanField(default=False)
    
    # Security & Authentication
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_user_agent = models.TextField(blank=True)
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    
    # Multi-Factor Authentication
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=32, blank=True)
    backup_codes = models.JSONField(default=list, blank=True)
    
    # Password Management
    password_changed_at = models.DateTimeField(null=True, blank=True)
    password_expires_at = models.DateTimeField(null=True, blank=True)
    must_change_password = models.BooleanField(default=False)
    password_history = models.JSONField(default=list, blank=True)
    
    # API Access
    api_key = models.CharField(max_length=40, blank=True, db_index=True)
    api_key_created_at = models.DateTimeField(null=True, blank=True)
    api_rate_limit = models.IntegerField(default=1000)  # requests per hour
    
    # Preferences & Settings
    language = models.CharField(max_length=10, default='en')
    timezone = models.CharField(max_length=50, default='UTC')
    theme = models.CharField(
        max_length=20,
        choices=[
            ('light', 'Light'),
            ('dark', 'Dark'),
            ('auto', 'Auto'),
        ],
        default='auto'
    )
    notifications_enabled = models.BooleanField(default=True)
    email_notifications = models.JSONField(default=dict, blank=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    tags = models.JSONField(default=list, blank=True)
    
    # Session Management
    active_sessions = models.JSONField(default=list, blank=True)
    
    # Compliance & Audit
    consent_given = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)
    data_retention_date = models.DateTimeField(null=True, blank=True)
    
    # Managers
    objects = UserManager()
    
    EMAIL_FIELD = 'email'
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
            models.Index(fields=['is_active', 'is_verified']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """Return the first_name plus the last_name, with a space in between."""
        full_name = f'{self.first_name} {self.last_name}'.strip()
        return full_name or self.display_name or self.username
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name or self.username
    
    def is_account_locked(self):
        """Check if account is locked due to failed login attempts"""
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False
    
    def increment_failed_login(self):
        """Increment failed login attempts and lock if necessary"""
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            self.locked_until = timezone.now() + timezone.timedelta(minutes=30)
        self.save(update_fields=['failed_login_attempts', 'locked_until'])
    
    def reset_failed_login(self):
        """Reset failed login attempts"""
        self.failed_login_attempts = 0
        self.locked_until = None
        self.save(update_fields=['failed_login_attempts', 'locked_until'])
    
    def generate_api_key(self):
        """Generate new API key"""
        import secrets
        self.api_key = secrets.token_urlsafe(32)
        self.api_key_created_at = timezone.now()
        self.save(update_fields=['api_key', 'api_key_created_at'])
        return self.api_key
    
    def revoke_api_key(self):
        """Revoke API key"""
        self.api_key = ''
        self.api_key_created_at = None
        self.save(update_fields=['api_key', 'api_key_created_at'])
    
    def add_session(self, session_id, ip_address, user_agent):
        """Add active session"""
        session = {
            'id': session_id,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'created_at': timezone.now().isoformat(),
        }
        self.active_sessions.append(session)
        # Keep only last 10 sessions
        self.active_sessions = self.active_sessions[-10:]
        self.save(update_fields=['active_sessions'])
    
    def remove_session(self, session_id):
        """Remove active session"""
        self.active_sessions = [
            s for s in self.active_sessions if s.get('id') != session_id
        ]
        self.save(update_fields=['active_sessions'])
    
    def clear_all_sessions(self):
        """Clear all active sessions"""
        self.active_sessions = []
        self.save(update_fields=['active_sessions'])


class Role(TimestampedModel):
    """
    Role model for RBAC
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Role Type
    role_type = models.CharField(
        max_length=20,
        choices=[
            ('system', 'System'),
            ('custom', 'Custom'),
        ],
        default='custom'
    )
    
    # Permissions
    permissions = models.ManyToManyField(
        'Permission',
        related_name='roles',
        blank=True
    )
    
    # Hierarchy
    parent_role = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_roles'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    objects = TenantAwareManager()
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.display_name or self.name
    
    def get_all_permissions(self):
        """Get all permissions including inherited from parent roles"""
        permissions = set(self.permissions.all())
        if self.parent_role:
            permissions.update(self.parent_role.get_all_permissions())
        return permissions


class Permission(TimestampedModel):
    """
    Permission model for fine-grained access control
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Permission categorization
    resource = models.CharField(max_length=100)
    action = models.CharField(max_length=50)
    
    # Scope
    scope = models.CharField(
        max_length=20,
        choices=[
            ('global', 'Global'),
            ('tenant', 'Tenant'),
            ('organization', 'Organization'),
            ('team', 'Team'),
            ('self', 'Self'),
        ],
        default='tenant'
    )
    
    # Conditions
    conditions = models.JSONField(default=dict, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['resource', 'action']
        unique_together = [['resource', 'action', 'scope']]
        indexes = [
            models.Index(fields=['resource', 'action']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.resource}:{self.action}"


class UserRole(TimestampedModel):
    """
    User-Role assignment with temporal validity
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_roles'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='user_assignments'
    )
    
    # Temporal validity
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True)
    
    # Assignment metadata
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='role_assignments_made'
    )
    assignment_reason = models.TextField(blank=True)
    
    # Scope limitation
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    team = models.ForeignKey(
        'organizations.Team',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    objects = TenantAwareManager()
    
    class Meta:
        unique_together = [['user', 'role', 'organization', 'team']]
        indexes = [
            models.Index(fields=['user', 'role']),
            models.Index(fields=['valid_from', 'valid_until']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.role}"
    
    def is_valid(self):
        """Check if role assignment is currently valid"""
        now = timezone.now()
        if self.valid_from > now:
            return False
        if self.valid_until and self.valid_until < now:
            return False
        return True


class UserSession(models.Model):
    """
    Track user sessions for security and audit
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='sessions'
    )
    
    # Session identification
    session_key = models.CharField(max_length=255, unique=True)
    jwt_token_id = models.CharField(max_length=255, blank=True)
    
    # Session metadata
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=50, blank=True)
    operating_system = models.CharField(max_length=50, blank=True)
    
    # Location (optional)
    country = models.CharField(max_length=2, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    # Session lifecycle
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    # Security flags
    is_active = models.BooleanField(default=True)
    is_suspicious = models.BooleanField(default=False)
    
    objects = TenantAwareManager()
    
    class Meta:
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.ip_address}"
    
    def revoke(self):
        """Revoke the session"""
        self.is_active = False
        self.revoked_at = timezone.now()
        self.save(update_fields=['is_active', 'revoked_at'])


class LoginHistory(models.Model):
    """
    Track login attempts for security audit
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='login_history',
        null=True,
        blank=True
    )
    
    # Login attempt details
    email = models.EmailField()
    success = models.BooleanField()
    failure_reason = models.CharField(max_length=100, blank=True)
    
    # Authentication method
    auth_method = models.CharField(
        max_length=20,
        choices=[
            ('password', 'Password'),
            ('sso', 'SSO'),
            ('api_key', 'API Key'),
            ('oauth', 'OAuth'),
            ('saml', 'SAML'),
        ],
        default='password'
    )
    
    # Request metadata
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    
    # Timestamp
    attempted_at = models.DateTimeField(auto_now_add=True)
    
    # Risk score
    risk_score = models.IntegerField(default=0)
    risk_factors = models.JSONField(default=list, blank=True)
    
    objects = TenantAwareManager()
    
    class Meta:
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['user', 'attempted_at']),
            models.Index(fields=['email', 'success']),
            models.Index(fields=['ip_address']),
        ]
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.email} - {status} - {self.attempted_at}"


class PasswordResetToken(models.Model):
    """
    Password reset tokens with enhanced security
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens'
    )
    
    # Token
    token = models.CharField(max_length=255, unique=True)
    
    # Validity
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    
    # Security
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    
    # Status
    is_used = models.BooleanField(default=False)
    is_revoked = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['user', 'is_used', 'is_revoked']),
        ]
    
    def __str__(self):
        return f"{self.user} - {self.created_at}"
    
    def is_valid(self):
        """Check if token is valid"""
        if self.is_used or self.is_revoked:
            return False
        if self.expires_at < timezone.now():
            return False
        return True
    
    def mark_as_used(self):
        """Mark token as used"""
        self.is_used = True
        self.used_at = timezone.now()
        self.save(update_fields=['is_used', 'used_at'])