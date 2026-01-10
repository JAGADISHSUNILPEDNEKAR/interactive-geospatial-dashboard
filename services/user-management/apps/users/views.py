"""
API Views for User Management Service
Implements RESTful endpoints with multi-tenant isolation
"""

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import make_password
from django.db.models import Q, Count
from django.utils import timezone
from django.core.cache import cache
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter
from apps.core.permissions import IsTenantUser, IsTenantAdmin
from apps.core.pagination import StandardResultsSetPagination
from apps.core.mixins import TenantAwareViewMixin
from apps.core.utils import get_client_ip
from apps.authentication.utils import send_verification_email, send_password_reset_email
from apps.audit.utils import log_activity
from .models import User, Role, Permission, UserRole, UserSession, LoginHistory
from .serializers import (
    UserSerializer, UserDetailSerializer, UserCreateSerializer,
    UserUpdateSerializer, RoleSerializer, PermissionSerializer,
    UserRoleSerializer, LoginSerializer, RegisterSerializer,
    PasswordResetSerializer, PasswordChangeSerializer,
    UserProfileSerializer, SessionSerializer
)
from .filters import UserFilter, RoleFilter
from .tasks import send_welcome_email, sync_user_to_services


class UserViewSet(TenantAwareViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for User CRUD operations with multi-tenant support
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsTenantUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = UserFilter
    search_fields = ['email', 'username', 'first_name', 'last_name']
    ordering_fields = ['created_at', 'email', 'last_login']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'retrieve':
            return UserDetailSerializer
        elif self.action == 'profile':
            return UserProfileSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsAuthenticated(), IsTenantAdmin()]
        return super().get_permissions()
    
    @extend_schema(
        summary="List all users in tenant",
        description="Returns paginated list of users with filtering and search"
    )
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # Add statistics
        stats = {
            'total_users': queryset.count(),
            'active_users': queryset.filter(is_active=True).count(),
            'verified_users': queryset.filter(is_verified=True).count(),
            'admin_users': queryset.filter(is_tenant_admin=True).count(),
        }
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['stats'] = stats
            return response
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'stats': stats
        })
    
    def create(self, request, *args, **kwargs):
        """Create new user with tenant assignment"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check tenant user limit
        tenant = request.tenant
        if tenant.max_users <= User.objects.filter(tenant=tenant).count():
            return Response(
                {'error': 'Tenant user limit reached'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create user
        user = serializer.save(tenant=tenant)
        
        # Send welcome email
        send_welcome_email.delay(user.id)
        
        # Sync to other services
        sync_user_to_services.delay(user.id, 'created')
        
        # Log activity
        log_activity(
            user=request.user,
            action='user_created',
            target=user,
            metadata={'created_user_id': str(user.id)}
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )
    
    def update(self, request, *args, **kwargs):
        """Update user with audit logging"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Store old values for audit
        old_values = UserSerializer(instance).data
        
        # Perform update
        self.perform_update(serializer)
        
        # Sync to other services
        sync_user_to_services.delay(instance.id, 'updated')
        
        # Log activity
        log_activity(
            user=request.user,
            action='user_updated',
            target=instance,
            metadata={
                'old_values': old_values,
                'new_values': serializer.data,
                'changed_fields': list(request.data.keys())
            }
        )
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete user"""
        instance = self.get_object()
        
        # Prevent self-deletion
        if instance == request.user:
            return Response(
                {'error': 'Cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Soft delete
        instance.soft_delete()
        
        # Revoke all sessions
        UserSession.objects.filter(user=instance, is_active=True).update(
            is_active=False,
            revoked_at=timezone.now()
        )
        
        # Sync to other services
        sync_user_to_services.delay(instance.id, 'deleted')
        
        # Log activity
        log_activity(
            user=request.user,
            action='user_deleted',
            target=instance,
            metadata={'deleted_user_id': str(instance.id)}
        )
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate user account"""
        user = self.get_object()
        user.is_active = True
        user.is_verified = True
        user.save(update_fields=['is_active', 'is_verified'])
        
        log_activity(
            user=request.user,
            action='user_activated',
            target=user
        )
        
        return Response({'status': 'User activated'})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate user account"""
        user = self.get_object()
        
        if user == request.user:
            return Response(
                {'error': 'Cannot deactivate your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = False
        user.save(update_fields=['is_active'])
        
        # Revoke sessions
        UserSession.objects.filter(user=user, is_active=True).update(
            is_active=False,
            revoked_at=timezone.now()
        )
        
        log_activity(
            user=request.user,
            action='user_deactivated',
            target=user
        )
        
        return Response({'status': 'User deactivated'})
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Send password reset email"""
        user = self.get_object()
        
        # Generate reset token
        token = user.generate_password_reset_token()
        
        # Send email
        send_password_reset_email.delay(user.id, token)
        
        log_activity(
            user=request.user,
            action='password_reset_requested',
            target=user
        )
        
        return Response({'status': 'Password reset email sent'})
    
    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        """Unlock user account"""
        user = self.get_object()
        user.reset_failed_login()
        
        log_activity(
            user=request.user,
            action='user_unlocked',
            target=user
        )
        
        return Response({'status': 'User unlocked'})
    
    @action(detail=True, methods=['get'])
    def sessions(self, request, pk=None):
        """Get user's active sessions"""
        user = self.get_object()
        sessions = UserSession.objects.filter(
            user=user,
            is_active=True
        ).order_by('-last_activity')
        
        serializer = SessionSerializer(sessions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def revoke_sessions(self, request, pk=None):
        """Revoke all user sessions"""
        user = self.get_object()
        count = UserSession.objects.filter(
            user=user,
            is_active=True
        ).update(
            is_active=False,
            revoked_at=timezone.now()
        )
        
        log_activity(
            user=request.user,
            action='sessions_revoked',
            target=user,
            metadata={'revoked_count': count}
        )
        
        return Response({'status': f'{count} sessions revoked'})
    
    @action(detail=True, methods=['get'])
    def roles(self, request, pk=None):
        """Get user's roles"""
        user = self.get_object()
        user_roles = UserRole.objects.filter(
            user=user
        ).select_related('role')
        
        serializer = UserRoleSerializer(user_roles, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign_role(self, request, pk=None):
        """Assign role to user"""
        user = self.get_object()
        role_id = request.data.get('role_id')
        
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response(
                {'error': 'Role not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        user_role, created = UserRole.objects.get_or_create(
            user=user,
            role=role,
            defaults={
                'assigned_by': request.user,
                'assignment_reason': request.data.get('reason', '')
            }
        )
        
        if created:
            log_activity(
                user=request.user,
                action='role_assigned',
                target=user,
                metadata={'role': role.name}
            )
            
            return Response(
                UserRoleSerializer(user_role).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(
            {'error': 'Role already assigned'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def remove_role(self, request, pk=None):
        """Remove role from user"""
        user = self.get_object()
        role_id = request.data.get('role_id')
        
        try:
            user_role = UserRole.objects.get(
                user=user,
                role_id=role_id
            )
            user_role.delete()
            
            log_activity(
                user=request.user,
                action='role_removed',
                target=user,
                metadata={'role_id': role_id}
            )
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except UserRole.DoesNotExist:
            return Response(
                {'error': 'Role assignment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'])
    def update_profile(self, request):
        """Update current user profile"""
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change current user password"""
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.password_changed_at = timezone.now()
        user.save()
        
        # Revoke all sessions except current
        UserSession.objects.filter(
            user=user,
            is_active=True
        ).exclude(
            session_key=request.session.session_key
        ).update(
            is_active=False,
            revoked_at=timezone.now()
        )
        
        log_activity(
            user=user,
            action='password_changed',
            target=user
        )
        
        return Response({'status': 'Password changed successfully'})


class RoleViewSet(TenantAwareViewMixin, viewsets.ModelViewSet):
    """
    ViewSet for Role management
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = RoleFilter
    search_fields = ['name', 'display_name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    @action(detail=True, methods=['get'])
    def permissions(self, request, pk=None):
        """Get role permissions"""
        role = self.get_object()
        permissions = role.get_all_permissions()
        serializer = PermissionSerializer(permissions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def assign_permission(self, request, pk=None):
        """Assign permission to role"""
        role = self.get_object()
        permission_id = request.data.get('permission_id')
        
        try:
            permission = Permission.objects.get(id=permission_id)
            role.permissions.add(permission)
            
            log_activity(
                user=request.user,
                action='permission_assigned',
                target=role,
                metadata={'permission': permission.name}
            )
            
            return Response({'status': 'Permission assigned'})
            
        except Permission.DoesNotExist:
            return Response(
                {'error': 'Permission not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AuthenticationView(TokenObtainPairView):
    """
    Enhanced authentication with multi-factor support
    """
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        password = request.data.get('password')
        
        # Get IP and user agent
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        # Track login attempt
        user = None
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            pass
        
        # Check if account is locked
        if user and user.is_account_locked():
            LoginHistory.objects.create(
                user=user,
                email=email,
                success=False,
                failure_reason='account_locked',
                ip_address=ip_address,
                user_agent=user_agent
            )
            return Response(
                {'error': 'Account is locked. Please try again later.'},
                status=status.HTTP_423_LOCKED
            )
        
        # Authenticate
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            # Track failed login
            if User.objects.filter(email=email).exists():
                target_user = User.objects.get(email=email)
                target_user.increment_failed_login()
                
                LoginHistory.objects.create(
                    user=target_user,
                    email=email,
                    success=False,
                    failure_reason='invalid_credentials',
                    ip_address=ip_address,
                    user_agent=user_agent
                )
            
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if user is active
        if not user.is_active:
            LoginHistory.objects.create(
                user=user,
                email=email,
                success=False,
                failure_reason='inactive_account',
                ip_address=ip_address,
                user_agent=user_agent
            )
            return Response(
                {'error': 'Account is inactive'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Reset failed login attempts
        user.reset_failed_login()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Create session
        session = UserSession.objects.create(
            user=user,
            session_key=request.session.session_key or str(refresh.access_token),
            jwt_token_id=str(refresh.access_token),
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=timezone.now() + timezone.timedelta(days=7)
        )
        
        # Track successful login
        LoginHistory.objects.create(
            user=user,
            email=email,
            success=True,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Update last login
        user.last_login = timezone.now()
        user.last_login_ip = ip_address
        user.last_login_user_agent = user_agent
        user.save(update_fields=['last_login', 'last_login_ip', 'last_login_user_agent'])
        
        # Log activity
        log_activity(
            user=user,
            action='user_login',
            target=user,
            metadata={
                'ip_address': ip_address,
                'session_id': str(session.id)
            }
        )
        
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'session_id': str(session.id),
            'expires_at': session.expires_at.isoformat()
        })


class LogoutView(viewsets.ViewSet):
    """
    Handle user logout and session cleanup
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """Logout user and revoke session"""
        # Get session
        session_key = request.data.get('session_id') or request.session.session_key
        
        # Revoke session
        if session_key:
            try:
                session = UserSession.objects.get(
                    session_key=session_key,
                    user=request.user,
                    is_active=True
                )
                session.revoke()
            except UserSession.DoesNotExist:
                pass
        
        # Django logout
        logout(request)
        
        # Log activity
        log_activity(
            user=request.user,
            action='user_logout',
            target=request.user,
            metadata={'session_key': session_key}
        )
        
        return Response({'status': 'Logged out successfully'})
    
    @action(detail=False, methods=['post'])
    def logout_all(self, request):
        """Logout from all devices"""
        # Revoke all sessions
        count = UserSession.objects.filter(
            user=request.user,
            is_active=True
        ).update(
            is_active=False,
            revoked_at=timezone.now()
        )
        
        # Log activity
        log_activity(
            user=request.user,
            action='logout_all_devices',
            target=request.user,
            metadata={'sessions_revoked': count}
        )
        
        return Response({'status': f'Logged out from {count} devices'})


class RegistrationView(viewsets.ViewSet):
    """
    Handle user registration with tenant creation
    """
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register new user and optionally create tenant"""
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check if creating new tenant or joining existing
        create_tenant = serializer.validated_data.get('create_tenant', False)
        tenant_invite_code = serializer.validated_data.get('tenant_invite_code')
        
        if create_tenant:
            # Create new tenant
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.create(
                name=serializer.validated_data['company_name'],
                slug=serializer.validated_data['company_slug'],
                company_name=serializer.validated_data['company_name'],
                company_email=serializer.validated_data['email']
            )
            
            # Create domain
            from apps.tenants.models import Domain
            Domain.objects.create(
                domain=f"{tenant.slug}.enterprise-saas.com",
                tenant=tenant,
                is_primary=True
            )
            
        elif tenant_invite_code:
            # Join existing tenant
            try:
                from apps.tenants.models import TenantInvite
                invite = TenantInvite.objects.get(
                    code=tenant_invite_code,
                    is_used=False,
                    expires_at__gt=timezone.now()
                )
                tenant = invite.tenant
                invite.mark_as_used()
            except TenantInvite.DoesNotExist:
                return Response(
                    {'error': 'Invalid or expired invite code'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {'error': 'Must either create tenant or provide invite code'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create user
        user = User.objects.create_user(
            email=serializer.validated_data['email'],
            username=serializer.validated_data.get('username', serializer.validated_data['email']),
            password=serializer.validated_data['password'],
            first_name=serializer.validated_data.get('first_name', ''),
            last_name=serializer.validated_data.get('last_name', ''),
            tenant=tenant,
            is_tenant_admin=create_tenant  # Make creator admin
        )
        
        # Send verification email
        send_verification_email.delay(user.id)
        
        # Create default role assignment
        if create_tenant:
            admin_role = Role.objects.get_or_create(
                name='admin',
                defaults={'display_name': 'Administrator'}
            )[0]
            UserRole.objects.create(
                user=user,
                role=admin_role
            )
        
        # Log activity
        log_activity(
            user=user,
            action='user_registered',
            target=user,
            metadata={
                'tenant_id': str(tenant.id),
                'created_tenant': create_tenant
            }
        )
        
        return Response({
            'user': UserSerializer(user).data,
            'tenant': {'id': str(tenant.id), 'name': tenant.name},
            'message': 'Registration successful. Please check your email to verify your account.'
        }, status=status.HTTP_201_CREATED)


class PasswordResetView(viewsets.ViewSet):
    """
    Handle password reset flow
    """
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def request_reset(self, request):
        """Request password reset"""
        email = request.data.get('email')
        
        try:
            user = User.objects.get(email=email)
            
            # Generate token
            from apps.users.models import PasswordResetToken
            import secrets
            
            token = PasswordResetToken.objects.create(
                user=user,
                token=secrets.token_urlsafe(32),
                expires_at=timezone.now() + timezone.timedelta(hours=1),
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            # Send email
            send_password_reset_email.delay(user.id, token.token)
            
            # Log activity
            log_activity(
                user=user,
                action='password_reset_requested',
                target=user,
                metadata={'ip_address': get_client_ip(request)}
            )
            
        except User.DoesNotExist:
            # Don't reveal if user exists
            pass
        
        return Response({
            'message': 'If the email exists, a password reset link has been sent.'
        })
    
    @action(detail=False, methods=['post'])
    def reset_password(self, request):
        """Reset password with token"""
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']
        
        # Validate token
        from apps.users.models import PasswordResetToken
        try:
            reset_token = PasswordResetToken.objects.get(
                token=token,
                is_used=False,
                is_revoked=False
            )
            
            if not reset_token.is_valid():
                return Response(
                    {'error': 'Invalid or expired token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Reset password
            user = reset_token.user
            user.set_password(new_password)
            user.password_changed_at = timezone.now()
            user.must_change_password = False
            user.save()
            
            # Mark token as used
            reset_token.mark_as_used()
            
            # Revoke all sessions
            UserSession.objects.filter(
                user=user,
                is_active=True
            ).update(
                is_active=False,
                revoked_at=timezone.now()
            )
            
            # Log activity
            log_activity(
                user=user,
                action='password_reset_completed',
                target=user
            )
            
            return Response({'message': 'Password reset successful'})
            
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Permission management (read-only)
    """
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'display_name', 'resource', 'action']
    
    @action(detail=False, methods=['get'])
    def by_resource(self, request):
        """Get permissions grouped by resource"""
        permissions = self.get_queryset()
        
        grouped = {}
        for perm in permissions:
            resource = perm.resource
            if resource not in grouped:
                grouped[resource] = []
            grouped[resource].append(PermissionSerializer(perm).data)
        
        return Response(grouped)
    
    @action(detail=False, methods=['get'])
    def check(self, request):
        """Check if current user has permission"""
        resource = request.query_params.get('resource')
        action = request.query_params.get('action')
        
        if not resource or not action:
            return Response(
                {'error': 'resource and action parameters required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        has_permission = request.user.has_perm(f'{resource}:{action}')
        
        return Response({
            'resource': resource,
            'action': action,
            'has_permission': has_permission
        })