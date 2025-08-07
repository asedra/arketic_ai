# PostgreSQL Database Documentation

## Overview
Arketic AI uses PostgreSQL as its primary database for storing all application data. The database supports multi-tenancy, real-time chat, AI assistants, knowledge management with vector search (PgVector), and form building capabilities.

## Database Configuration
- **Connection**: Configured via `DATABASE_URL` environment variable
- **Pool Size**: Default 10 connections (configurable via `DB_POOL_SIZE`)
- **Max Overflow**: Default 20 connections (configurable via `DB_MAX_OVERFLOW`)
- **Connection Recycling**: Every 3600 seconds (1 hour)
- **Extensions**: PgVector for semantic search and vector embeddings

## Table Structure

### User & Authentication Tables

#### `users`
Core user authentication and basic information.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| email | String(255) | User email address | Unique, Not Null, Indexed |
| username | String(50) | Optional username | Unique, Indexed |
| password_hash | String(255) | Hashed password | Not Null |
| first_name | String(100) | User's first name | Not Null |
| last_name | String(100) | User's last name | Not Null |
| role | Enum(UserRole) | User role (super_admin, admin, user, viewer) | Not Null, Default: user |
| status | Enum(UserStatus) | Account status (active, inactive, suspended, pending_verification) | Not Null, Default: pending_verification |
| is_verified | Boolean | Email verification status | Default: False |
| is_active | Boolean | Account active status | Default: True |
| created_at | DateTime | Account creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |
| last_login_at | DateTime | Last login timestamp | Nullable |
| email_verified_at | DateTime | Email verification timestamp | Nullable |
| password_changed_at | DateTime | Password last changed | Not Null, Default: now() |
| failed_login_attempts | Integer | Failed login counter | Default: 0 |
| locked_until | DateTime | Account lock expiration | Nullable |
| two_factor_enabled | Boolean | 2FA status | Default: False |
| two_factor_secret | String(32) | 2FA secret key | Nullable |

**Indexes:**
- `idx_user_email_status` (email, status)
- `idx_user_created_at` (created_at)
- `idx_user_role_status` (role, status)

**Relationships:**
- One-to-One: `user_profiles`, `user_preferences`
- One-to-Many: `api_keys`, `refresh_tokens`, `password_reset_tokens`

---

#### `user_profiles`
Extended user profile information.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| user_id | UUID | Reference to users table | FK(users.id), Unique, Not Null |
| avatar_url | String(500) | Profile picture URL | Nullable |
| bio | Text | User biography | Nullable |
| job_title | String(100) | Professional title | Nullable |
| company | String(100) | Company name | Nullable |
| location | String(100) | Geographic location | Nullable |
| timezone | String(50) | User timezone | Default: 'UTC' |
| language | String(10) | Preferred language | Default: 'en' |
| phone | String(20) | Phone number | Nullable |
| website | String(200) | Personal website | Nullable |
| linkedin_url | String(200) | LinkedIn profile | Nullable |
| github_url | String(200) | GitHub profile | Nullable |
| skills | JSON | List of skills | Nullable |
| certifications | JSON | List of certifications | Nullable |
| experience_years | Integer | Years of experience | Nullable |
| created_at | DateTime | Profile creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

---

#### `user_preferences`
User application preferences and settings.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| user_id | UUID | Reference to users table | FK(users.id), Unique, Not Null |
| theme | String(20) | UI theme (light, dark, auto) | Default: 'light' |
| sidebar_collapsed | Boolean | Sidebar state | Default: False |
| notifications_enabled | Boolean | Global notifications | Default: True |
| email_notifications | Boolean | Email notifications | Default: True |
| push_notifications | Boolean | Push notifications | Default: True |
| default_ai_model | String(50) | Default AI model | Default: 'gpt-4o' |
| ai_response_style | String(20) | AI style (concise, balanced, detailed) | Default: 'balanced' |
| ai_creativity_level | Integer | AI creativity (1-10) | Default: 5 |
| enable_ai_suggestions | Boolean | AI suggestions | Default: True |
| profile_visibility | String(20) | Profile visibility (public, organization, private) | Default: 'organization' |
| show_online_status | Boolean | Online status visibility | Default: True |
| allow_data_collection | Boolean | Data collection consent | Default: True |
| default_workflow_timeout | Integer | Workflow timeout (seconds) | Default: 3600 |
| auto_save_interval | Integer | Auto-save interval (seconds) | Default: 300 |
| enable_keyboard_shortcuts | Boolean | Keyboard shortcuts | Default: True |
| custom_settings | JSON | Additional custom settings | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

---

#### `user_api_keys`
Encrypted storage for external API keys.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| user_id | UUID | Reference to users table | FK(users.id), Not Null |
| provider | String(50) | API provider (openai, anthropic, groq, etc.) | Not Null |
| key_name | String(100) | User-friendly key name | Not Null |
| encrypted_key | LargeBinary | AES encrypted API key | Not Null |
| key_hash | String(64) | SHA256 hash for verification | Not Null |
| is_active | Boolean | Key active status | Default: True |
| last_used_at | DateTime | Last usage timestamp | Nullable |
| usage_count | Integer | Usage counter | Default: 0 |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_user_api_key_provider` (user_id, provider)
- `idx_api_key_active` (is_active)

**Constraints:**
- `unique_user_provider_key` (user_id, provider, key_name)

---

#### `refresh_tokens`
JWT refresh token storage.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| user_id | UUID | Reference to users table | FK(users.id), Not Null |
| token_hash | String(64) | SHA256 hash of token | Unique, Not Null, Indexed |
| expires_at | DateTime | Token expiration | Not Null |
| is_revoked | Boolean | Revocation status | Default: False |
| device_info | String(200) | User agent or device ID | Nullable |
| ip_address | String(45) | IPv4 or IPv6 address | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| last_used_at | DateTime | Last usage timestamp | Nullable |

**Indexes:**
- `idx_refresh_token_user_active` (user_id, is_revoked)
- `idx_refresh_token_expires` (expires_at)

---

#### `password_reset_tokens`
Password reset token management.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| user_id | UUID | Reference to users table | FK(users.id), Not Null |
| token_hash | String(64) | SHA256 hash of token | Unique, Not Null, Indexed |
| expires_at | DateTime | Token expiration | Not Null |
| is_used | Boolean | Usage status | Default: False |
| ip_address | String(45) | Request IP address | Nullable |
| user_agent | String(500) | Request user agent | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| used_at | DateTime | Usage timestamp | Nullable |

**Indexes:**
- `idx_password_reset_user` (user_id)
- `idx_password_reset_expires` (expires_at)

---

#### `email_verification_tokens`
Email verification token management.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| user_id | UUID | Reference to users table | FK(users.id), Not Null |
| token_hash | String(64) | SHA256 hash of token | Unique, Not Null, Indexed |
| expires_at | DateTime | Token expiration | Not Null |
| is_used | Boolean | Usage status | Default: False |
| email | String(255) | Email being verified | Not Null |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| used_at | DateTime | Usage timestamp | Nullable |

**Indexes:**
- `idx_email_verification_user` (user_id)
- `idx_email_verification_expires` (expires_at)
- `idx_email_verification_email` (email)

---

### Organization & Multi-tenancy Tables

#### `organizations`
Multi-tenant organization management.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| name | String(200) | Organization name | Not Null |
| slug | String(100) | URL-friendly identifier | Unique, Not Null, Indexed |
| description | Text | Organization description | Nullable |
| website | String(200) | Organization website | Nullable |
| email | String(255) | Contact email | Nullable |
| phone | String(20) | Contact phone | Nullable |
| address_line1 | String(200) | Street address | Nullable |
| address_line2 | String(200) | Additional address | Nullable |
| city | String(100) | City | Nullable |
| state | String(100) | State/Province | Nullable |
| postal_code | String(20) | Postal/ZIP code | Nullable |
| country | String(100) | Country | Nullable |
| logo_url | String(500) | Organization logo | Nullable |
| timezone | String(50) | Default timezone | Default: 'UTC' |
| default_language | String(10) | Default language | Default: 'en' |
| status | Enum(OrganizationStatus) | Status (active, inactive, suspended, trial) | Default: trial |
| subscription_tier | Enum(SubscriptionTier) | Tier (free, starter, professional, enterprise) | Default: free |
| max_members | Integer | Member limit | Default: 5 |
| max_storage_gb | Integer | Storage limit (GB) | Default: 1 |
| max_ai_requests_per_month | Integer | AI request limit | Default: 1000 |
| current_members | Integer | Current member count | Default: 0 |
| current_storage_mb | Integer | Current storage (MB) | Default: 0 |
| ai_requests_this_month | Integer | Current month AI requests | Default: 0 |
| billing_email | String(255) | Billing contact | Nullable |
| tax_id | String(50) | Tax identification | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |
| trial_ends_at | DateTime | Trial expiration | Nullable |
| subscription_ends_at | DateTime | Subscription expiration | Nullable |

**Indexes:**
- `idx_org_status` (status)
- `idx_org_subscription` (subscription_tier)
- `idx_org_created` (created_at)

**Relationships:**
- One-to-Many: `organization_members`

---

#### `organization_members`
Organization membership management.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| organization_id | UUID | Reference to organizations | FK(organizations.id), Not Null |
| user_id | UUID | Reference to users | FK(users.id), Not Null |
| role | Enum(OrganizationRole) | Member role (owner, admin, manager, member, guest) | Default: member |
| is_active | Boolean | Membership status | Default: True |
| invited_by_id | UUID | Inviter user ID | FK(users.id), Nullable |
| invitation_token | String(100) | Invitation token | Unique, Nullable |
| invitation_expires_at | DateTime | Invitation expiration | Nullable |
| invitation_accepted_at | DateTime | Acceptance timestamp | Nullable |
| last_activity_at | DateTime | Last activity | Nullable |
| created_at | DateTime | Join timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |
| left_at | DateTime | Leave timestamp | Nullable |

**Indexes:**
- `idx_member_org` (organization_id)
- `idx_member_user` (user_id)
- `idx_member_role` (role)
- `idx_member_active` (is_active)

**Constraints:**
- `uq_org_member` (organization_id, user_id)

---

#### `people`
Organization members/employees directory.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| first_name | String(100) | First name | Not Null |
| last_name | String(100) | Last name | Not Null |
| email | String(255) | Email address | Unique, Not Null |
| phone | String(20) | Phone number | Nullable |
| job_title | String(200) | Job title | Nullable |
| department | String(100) | Department | Nullable |
| site | String(200) | Work site/location | Nullable |
| location | String(200) | Geographic location | Nullable |
| role | Enum(PersonRole) | System role (ADMIN, USER, MANAGER, VIEWER) | Not Null |
| status | Enum(PersonStatus) | Status (ACTIVE, INACTIVE, PENDING) | Not Null |
| hire_date | DateTime | Hire date | Nullable |
| manager_id | UUID | Reference to manager | FK(people.id), Nullable |
| notes | Text | Additional notes | Nullable |
| extra_data | JSON | Additional metadata | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_person_email` (email)
- `idx_person_department` (department)
- `idx_person_status` (status)
- `idx_person_manager` (manager_id)

**Relationships:**
- Self-referential: manager/direct_reports

---

### Chat & Messaging Tables

#### `chats`
Chat conversation management.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| creator_id | UUID | Chat creator | FK(users.id), Nullable |
| title | String(200) | Chat title | Not Null |
| description | Text | Chat description | Nullable |
| chat_type | Enum(ChatType) | Type (direct, group, channel) | Default: direct |
| ai_model | String(50) | AI model to use | Nullable |
| ai_persona | String(100) | AI personality/role | Nullable |
| system_prompt | Text | Custom system prompt | Nullable |
| temperature | Numeric(3,2) | AI creativity (0.0-1.0) | Default: 0.7 |
| max_tokens | Integer | Max response tokens | Default: 2048 |
| is_private | Boolean | Privacy setting | Default: False |
| is_archived | Boolean | Archive status | Default: False |
| allow_file_uploads | Boolean | File upload permission | Default: True |
| enable_ai_responses | Boolean | AI responses enabled | Default: True |
| tags | JSON | Organization tags | Nullable |
| chat_metadata | JSON | Additional metadata | Nullable |
| message_count | Integer | Total messages | Default: 0 |
| total_tokens_used | Integer | Total tokens consumed | Default: 0 |
| last_activity_at | DateTime | Last activity | Not Null, Default: now() |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |
| archived_at | DateTime | Archive timestamp | Nullable |

**Indexes:**
- `idx_chat_creator_type` (creator_id, chat_type)
- `idx_chat_creator` (creator_id)
- `idx_chat_activity` (last_activity_at, is_archived)
- `idx_chat_archived` (is_archived)
- `idx_chat_private` (is_private)
- `idx_chat_ai_model` (ai_model)
- `idx_chat_created_at` (created_at)

**Relationships:**
- One-to-Many: `chat_messages`, `chat_participants`

---

#### `chat_messages`
Individual chat messages.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| chat_id | UUID | Reference to chat | FK(chats.id), Not Null |
| sender_id | UUID | Message sender | FK(users.id), Nullable |
| reply_to_id | UUID | Reply reference | FK(chat_messages.id), Nullable |
| message_type | Enum(MessageType) | Type (user, ai, system, file, image, audio) | Default: user |
| content | Text | Message content | Not Null |
| file_url | String(500) | File attachment URL | Nullable |
| file_name | String(255) | File name | Nullable |
| file_size | Integer | File size (bytes) | Nullable |
| file_type | String(50) | MIME type | Nullable |
| ai_model_used | String(50) | AI model used | Nullable |
| tokens_used | Integer | Tokens consumed | Nullable |
| processing_time_ms | Integer | Processing time (ms) | Nullable |
| ai_confidence_score | Numeric(5,4) | AI confidence (0.0000-1.0000) | Nullable |
| status | Enum(MessageStatus) | Status (sent, delivered, read, failed) | Default: sent |
| is_edited | Boolean | Edit status | Default: False |
| is_deleted | Boolean | Deletion status | Default: False |
| message_metadata | JSON | Additional metadata | Nullable |
| created_at | DateTime | Send timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |
| edited_at | DateTime | Edit timestamp | Nullable |
| deleted_at | DateTime | Deletion timestamp | Nullable |

**Indexes:**
- `idx_message_chat_created` (chat_id, created_at, is_deleted)
- `idx_message_chat_type` (chat_id, message_type)
- `idx_message_sender` (sender_id, created_at)
- `idx_message_type` (message_type)
- `idx_message_status` (status)
- `idx_message_deleted` (is_deleted)
- `idx_message_reply` (reply_to_id)
- `idx_message_ai_model` (ai_model_used)

**Relationships:**
- Self-referential: reply_to

---

#### `chat_participants`
Chat access control and participation.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| chat_id | UUID | Reference to chat | FK(chats.id), Not Null |
| user_id | UUID | Reference to user | FK(users.id), Not Null |
| role | Enum(ParticipantRole) | Role (owner, admin, member, viewer) | Default: member |
| is_active | Boolean | Active status | Default: True |
| is_muted | Boolean | Mute status | Default: False |
| can_send_messages | Boolean | Send permission | Default: True |
| can_upload_files | Boolean | Upload permission | Default: True |
| can_invite_others | Boolean | Invite permission | Default: False |
| last_read_message_id | UUID | Last read message | FK(chat_messages.id), Nullable |
| last_read_at | DateTime | Last read timestamp | Nullable |
| message_count | Integer | Messages sent | Default: 0 |
| joined_at | DateTime | Join timestamp | Not Null, Default: now() |
| left_at | DateTime | Leave timestamp | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_participant_chat_user` (chat_id, user_id) - Unique
- `idx_participant_chat_active` (chat_id, is_active)
- `idx_participant_user_active` (user_id, is_active)
- `idx_participant_role` (role)
- `idx_participant_permissions` (can_send_messages, can_upload_files)
- `idx_participant_joined` (joined_at)

---

### Forms & Adaptive Cards Tables

#### `forms`
Adaptive Cards form storage.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| title | String(255) | Form title | Not Null, Indexed |
| description | Text | Form description | Nullable |
| schema_version | String(10) | Adaptive Card version | Default: '1.5' |
| adaptive_card_json | JSON | Adaptive Card definition | Not Null |
| elements_json | JSON | Designer elements | Nullable |
| status | Enum(FormStatus) | Status (draft, published, archived, deleted) | Default: draft, Indexed |
| visibility | Enum(FormVisibility) | Visibility (private, organization, public) | Default: private |
| is_template | Boolean | Template flag | Default: False, Indexed |
| allow_anonymous | Boolean | Anonymous submissions | Default: False |
| submit_message | Text | Submission message | Nullable |
| redirect_url | String(500) | Redirect after submit | Nullable |
| email_notifications | JSON | Notification emails | Nullable |
| webhook_url | String(500) | Webhook endpoint | Nullable |
| max_submissions | Integer | Submission limit | Nullable |
| submission_count | Integer | Current submissions | Default: 0 |
| expires_at | DateTime | Form expiration | Nullable |
| created_by | UUID | Form creator | FK(users.id), Not Null, Indexed |
| version | Integer | Version number | Default: 1 |
| parent_form_id | UUID | Parent form reference | FK(forms.id), Nullable |
| tags | JSON | Form tags | Nullable |
| category | String(50) | Form category | Nullable, Indexed |
| view_count | Integer | View counter | Default: 0 |
| last_submitted_at | DateTime | Last submission | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now(), Indexed |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |
| published_at | DateTime | Publication timestamp | Nullable |

**Indexes:**
- `idx_form_creator_status` (created_by, status)
- `idx_form_template_status` (is_template, status)
- `idx_form_visibility_status` (visibility, status)
- `idx_form_created_at_desc` (created_at)
- `idx_form_updated_at_desc` (updated_at)

**Relationships:**
- One-to-Many: `form_submissions`, `form_versions`, `form_shares`
- Many-to-Many: `form_collaborators`

---

#### `form_templates`
Pre-defined form templates.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| name | String(255) | Template name | Not Null, Indexed |
| description | Text | Template description | Nullable |
| adaptive_card_json | JSON | Adaptive Card definition | Not Null |
| elements_json | JSON | Designer elements | Nullable |
| category | String(50) | Template category | Not Null, Indexed |
| tags | JSON | Template tags | Nullable |
| is_public | Boolean | Public availability | Default: True |
| is_featured | Boolean | Featured status | Default: False |
| usage_count | Integer | Usage counter | Default: 0 |
| created_by | UUID | Template creator | FK(users.id), Not Null |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_template_category_public` (category, is_public)
- `idx_template_featured_public` (is_featured, is_public)
- `idx_template_usage_count` (usage_count)

---

#### `form_submissions`
Form submission data.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| form_id | UUID | Reference to form | FK(forms.id), Not Null, Indexed |
| data | JSON | Submission data | Not Null |
| submitter_ip | String(45) | IP address | Nullable |
| submitter_user_agent | String(500) | User agent | Nullable |
| submitter_user_id | UUID | Submitter user | FK(users.id), Nullable |
| is_processed | Boolean | Processing status | Default: False |
| processing_error | Text | Processing error | Nullable |
| submitted_at | DateTime | Submission timestamp | Not Null, Default: now(), Indexed |
| processed_at | DateTime | Processing timestamp | Nullable |

**Indexes:**
- `idx_submission_form_submitted` (form_id, submitted_at)
- `idx_submission_user_submitted` (submitter_user_id, submitted_at)
- `idx_submission_processed` (is_processed)

---

#### `form_versions`
Form version history.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| form_id | UUID | Reference to form | FK(forms.id), Not Null, Indexed |
| version_number | Integer | Version number | Not Null |
| change_description | Text | Change description | Nullable |
| title | String(255) | Form title snapshot | Not Null |
| description | Text | Description snapshot | Nullable |
| adaptive_card_json | JSON | Card definition snapshot | Not Null |
| elements_json | JSON | Elements snapshot | Nullable |
| created_by | UUID | Version creator | FK(users.id), Not Null |
| created_at | DateTime | Version timestamp | Not Null, Default: now(), Indexed |

**Indexes:**
- `idx_version_form_number` (form_id, version_number)
- `idx_version_created_at` (created_at)

**Constraints:**
- `unique_form_version` (form_id, version_number)

---

#### `form_shares`
Form sharing permissions.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| form_id | UUID | Reference to form | FK(forms.id), Not Null, Indexed |
| shared_with_user_id | UUID | Recipient user | FK(users.id), Not Null, Indexed |
| shared_by_user_id | UUID | Sharing user | FK(users.id), Not Null |
| permission | Enum(FormSharePermission) | Permission (view, edit, admin) | Default: view |
| can_reshare | Boolean | Reshare permission | Default: False |
| message | Text | Share message | Nullable |
| expires_at | DateTime | Share expiration | Nullable |
| shared_at | DateTime | Share timestamp | Not Null, Default: now() |
| last_accessed_at | DateTime | Last access | Nullable |

**Indexes:**
- `idx_share_form_permission` (form_id, permission)
- `idx_share_user_permission` (shared_with_user_id, permission)
- `idx_share_expires` (expires_at)

**Constraints:**
- `unique_form_user_share` (form_id, shared_with_user_id)

---

#### `form_collaborators`
Form collaboration junction table.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| form_id | UUID | Reference to form | FK(forms.id), PK |
| user_id | UUID | Reference to user | FK(users.id), PK |
| permission | Enum(FormSharePermission) | Permission level | Default: view |
| created_at | DateTime | Collaboration start | Not Null, Default: now() |
| created_by | UUID | Added by user | FK(users.id), Not Null |

**Indexes:**
- `idx_form_collaborators_form` (form_id)
- `idx_form_collaborators_user` (user_id)

---

### AI Assistant Tables

#### `assistants`
AI assistant configurations.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| name | String(200) | Assistant name | Not Null |
| description | Text | Assistant description | Nullable |
| system_prompt | Text | System prompt | Nullable |
| ai_model | Enum(AIModel) | AI model | Default: gpt-4o |
| temperature | Float | Temperature (0.0-2.0) | Default: 0.7 |
| max_tokens | Integer | Max tokens (1-32000) | Default: 2048 |
| status | Enum(AssistantStatus) | Status (active, inactive, draft, archived) | Default: active |
| is_public | Boolean | Public availability | Default: False |
| creator_id | UUID | Assistant creator | FK(users.id), Not Null |
| total_conversations | Integer | Conversation count | Default: 0 |
| total_messages | Integer | Message count | Default: 0 |
| total_tokens_used | Integer | Total tokens used | Default: 0 |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |
| last_used_at | DateTime | Last usage | Nullable |
| configuration | JSON | Additional config | Nullable |

**Indexes:**
- `idx_assistant_creator_status` (creator_id, status)
- `idx_assistant_model` (ai_model)
- `idx_assistant_created_at` (created_at)
- `idx_assistant_name` (name)
- `idx_assistant_public_status` (is_public, status)

**Supported AI Models:**
- GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku

---

#### `assistant_usage_logs`
Assistant usage analytics.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| assistant_id | UUID | Reference to assistant | FK(assistants.id), Not Null |
| user_id | UUID | Reference to user | FK(users.id), Not Null |
| chat_id | UUID | Reference to chat | FK(chats.id), Nullable |
| action | String(50) | Action type | Not Null |
| tokens_used | Integer | Tokens consumed | Default: 0 |
| processing_time_ms | Integer | Processing time | Nullable |
| usage_metadata | JSON | Additional metadata | Nullable |
| created_at | DateTime | Log timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_usage_assistant_date` (assistant_id, created_at)
- `idx_usage_user_date` (user_id, created_at)
- `idx_usage_action` (action)

---

### Knowledge Management & Vector Search Tables (PgVector)

#### `knowledge_bases`
Document collections for knowledge management.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| organization_id | UUID | Reference to organization | FK(organizations.id), Not Null |
| creator_id | UUID | Reference to creator | FK(users.id), Nullable |
| name | String(200) | Knowledge base name | Not Null |
| description | Text | Description | Nullable |
| type | Enum | Type (documentation, faq, product, general, custom) | Default: general |
| is_public | Boolean | Public access | Default: False |
| is_active | Boolean | Active status | Default: True |
| embedding_model | String(100) | Embedding model | Default: 'text-embedding-3-small' |
| embedding_dimensions | Integer | Vector dimensions | Default: 1536 |
| total_documents | Integer | Document count | Default: 0 |
| total_chunks | Integer | Chunk count | Default: 0 |
| total_tokens | Integer | Token count | Default: 0 |
| metadata | JSON | Additional metadata | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_kb_organization` (organization_id)
- `idx_kb_creator` (creator_id)
- `idx_kb_type` (type)
- `idx_kb_active` (is_active)

---

#### `knowledge_documents`
Documents within knowledge bases.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| knowledge_base_id | UUID | Reference to knowledge base | FK(knowledge_bases.id), Not Null |
| uploader_id | UUID | Reference to uploader | FK(users.id), Nullable |
| title | String(500) | Document title | Not Null |
| source_type | Enum | Source (file, url, text, api) | Default: file |
| source_url | String(1000) | Source URL | Nullable |
| file_name | String(255) | File name | Nullable |
| file_type | String(50) | MIME type | Nullable |
| file_size | Integer | File size (bytes) | Nullable |
| file_hash | String(64) | SHA256 hash | Nullable |
| content | Text | Document content | Nullable |
| chunk_count | Integer | Number of chunks | Default: 0 |
| token_count | Integer | Token count | Default: 0 |
| processing_status | Enum | Status (pending, processing, completed, failed) | Default: pending |
| error_message | Text | Processing error | Nullable |
| tags | JSON | Document tags | Nullable |
| metadata | JSON | Additional metadata | Nullable |
| created_at | DateTime | Upload timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |
| processed_at | DateTime | Processing timestamp | Nullable |

**Indexes:**
- `idx_doc_knowledge_base` (knowledge_base_id)
- `idx_doc_uploader` (uploader_id)
- `idx_doc_status` (processing_status)
- `idx_doc_source_type` (source_type)
- `idx_doc_file_hash` (file_hash)

---

#### `knowledge_embeddings`
Vector embeddings for semantic search.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| document_id | UUID | Reference to document | FK(knowledge_documents.id), Not Null |
| knowledge_base_id | UUID | Reference to knowledge base | FK(knowledge_bases.id), Not Null |
| chunk_index | Integer | Chunk position | Not Null |
| chunk_size | Integer | Chunk size | Not Null |
| content | Text | Chunk content | Not Null |
| embedding | Vector(1536) | Vector embedding (PgVector) | Not Null |
| token_count | Integer | Token count | Not Null |
| metadata | JSON | Additional metadata | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_emb_document` (document_id)
- `idx_emb_knowledge_base` (knowledge_base_id)
- `idx_emb_chunk` (document_id, chunk_index)
- `idx_emb_created` (created_at)
- `idx_embedding_vector_hnsw` - HNSW index on embedding column for fast similarity search
- `idx_emb_metadata_gin` - GIN index on metadata for JSON filtering

**Vector Search:**
- Uses PgVector extension for semantic similarity search
- HNSW index with m=16, ef_construction=64 for optimal performance
- Supports cosine similarity searches

---

#### `knowledge_search_history`
Search analytics and history.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| knowledge_base_id | UUID | Reference to knowledge base | FK(knowledge_bases.id), Not Null |
| user_id | UUID | Reference to user | FK(users.id), Nullable |
| query | Text | Search query | Not Null |
| query_embedding | Vector(1536) | Query vector | Nullable |
| results_count | Integer | Number of results | Default: 0 |
| top_score | Numeric(5,4) | Best similarity score | Nullable |
| execution_time_ms | Integer | Query time (ms) | Nullable |
| search_type | Enum | Type (semantic, keyword, hybrid) | Default: semantic |
| filters_applied | JSON | Applied filters | Nullable |
| selected_result_id | UUID | Selected result | Nullable |
| feedback_rating | Integer | User rating (1-5) | Nullable |
| created_at | DateTime | Search timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_search_kb` (knowledge_base_id)
- `idx_search_user` (user_id)
- `idx_search_created` (created_at)
- `idx_search_type` (search_type)

---

#### `semantic_cache`
Cached semantic queries for performance.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| organization_id | UUID | Reference to organization | FK(organizations.id), Not Null |
| query | Text | Original query | Not Null |
| query_embedding | Vector(1536) | Query vector | Not Null |
| response | Text | Cached response | Not Null |
| model_used | String(50) | AI model used | Nullable |
| hit_count | Integer | Cache hit count | Default: 1 |
| last_accessed_at | DateTime | Last access | Not Null, Default: now() |
| expires_at | DateTime | Cache expiration | Nullable |
| metadata | JSON | Additional metadata | Nullable |
| created_at | DateTime | Cache timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_cache_org` (organization_id)
- `idx_cache_expires` (expires_at)
- `idx_cache_accessed` (last_accessed_at)
- `idx_cache_query_vector_hnsw` - HNSW index for semantic cache lookups

---

#### `vector_performance_metrics`
Performance monitoring for vector operations.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| operation_type | Enum | Operation (insert, search, update, delete) | Not Null |
| table_name | String(100) | Target table | Not Null |
| batch_size | Integer | Batch size | Nullable |
| execution_time_ms | Integer | Execution time (ms) | Not Null |
| vector_count | Integer | Vectors processed | Nullable |
| memory_usage_mb | Numeric(10,2) | Memory usage (MB) | Nullable |
| metadata | JSON | Additional metrics | Nullable |
| created_at | DateTime | Metric timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_perf_operation` (operation_type)
- `idx_perf_table` (table_name)
- `idx_perf_created` (created_at)

---

### Settings Tables

#### `user_settings`
User-specific settings storage.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| user_id | UUID | Reference to user | FK(users.id), Not Null |
| category | String(50) | Setting category | Not Null |
| setting_key | String(100) | Setting key | Not Null |
| setting_value | Text | Setting value | Nullable |
| is_encrypted | Boolean | Encryption status | Default: False |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_user_settings_user_category` (user_id, category)
- `idx_user_settings_updated` (updated_at)

**Constraints:**
- `uk_user_settings_key` (user_id, category, setting_key)

---

#### `openai_settings`
OpenAI API configuration.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| user_id | UUID | Reference to user | FK(users.id), Unique, Not Null |
| api_key_encrypted | Text | Encrypted API key | Nullable |
| model | String(50) | Default model | Default: 'gpt-3.5-turbo' |
| max_tokens | Integer | Max tokens (1-8192) | Default: 1000 |
| temperature | Float | Temperature (0.0-2.0) | Default: 0.7 |
| total_requests | Integer | Request count | Default: 0 |
| total_tokens_used | Integer | Total tokens used | Default: 0 |
| last_used_at | DateTime | Last usage | Nullable |
| is_connection_verified | Boolean | Connection status | Default: False |
| last_connection_test_at | DateTime | Last test | Nullable |
| connection_test_error | Text | Test error | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_openai_settings_user` (user_id)
- `idx_openai_settings_updated` (updated_at)
- `idx_openai_settings_last_used` (last_used_at)

---

#### `platform_settings`
Platform-wide user settings.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, Default: uuid4 |
| user_id | UUID | Reference to user | FK(users.id), Unique, Not Null |
| theme | String(20) | UI theme (light, dark, auto) | Default: 'light' |
| language | String(10) | Language code | Default: 'en' |
| timezone | String(50) | User timezone | Default: 'UTC' |
| date_format | String(20) | Date format | Default: 'YYYY-MM-DD' |
| email_notifications | Boolean | Email notifications | Default: True |
| push_notifications | Boolean | Push notifications | Default: True |
| marketing_emails | Boolean | Marketing emails | Default: False |
| data_collection_consent | Boolean | Data collection | Default: True |
| analytics_consent | Boolean | Analytics | Default: True |
| beta_features_enabled | Boolean | Beta features | Default: False |
| advanced_mode | Boolean | Advanced mode | Default: False |
| custom_settings | JSON | Custom settings | Nullable |
| created_at | DateTime | Creation timestamp | Not Null, Default: now() |
| updated_at | DateTime | Last update timestamp | Not Null, Default: now() |

**Indexes:**
- `idx_platform_settings_user` (user_id)
- `idx_platform_settings_updated` (updated_at)

---

## Database Migrations

The database uses Alembic for migration management. Key migrations include:

1. **001-004**: Initial schema setup
2. **005_add_pgvector_extension**: Added PgVector extension and knowledge management tables
3. **007_remove_organization_id**: Removed organization constraints from certain tables
4. **009_add_assistants_tables**: Added AI assistant functionality

## Performance Considerations

1. **Indexing Strategy**:
   - Primary keys use UUID with default uuid4 generation
   - Foreign keys are indexed for join performance
   - Composite indexes for common query patterns
   - HNSW indexes for vector similarity searches
   - GIN indexes for JSON field queries

2. **Connection Pooling**:
   - Default pool size: 10 connections
   - Max overflow: 20 connections
   - Connection recycling every hour
   - Pool timeout: 30 seconds

3. **Vector Search Optimization**:
   - HNSW index parameters optimized for balance between speed and accuracy
   - Embedding dimensions: 1536 (OpenAI text-embedding-3-small)
   - Cosine similarity for semantic search

4. **Query Optimization**:
   - Expire on commit disabled for better performance
   - Auto-flush disabled to prevent premature constraint checks
   - Proper indexes on frequently queried columns

## Security Features

1. **Password Security**:
   - Passwords stored as hashed values
   - Password change tracking
   - Failed login attempt tracking
   - Account lockout mechanism

2. **Token Management**:
   - SHA256 hashing for all tokens
   - Expiration tracking
   - Revocation support

3. **API Key Encryption**:
   - AES encryption for stored API keys
   - SHA256 hash for verification

4. **Multi-tenancy Isolation**:
   - Organization-based data separation
   - Role-based access control at multiple levels

## Maintenance Notes

1. **Regular Tasks**:
   - Monitor connection pool usage
   - Clean expired tokens regularly
   - Update vector indexes after bulk inserts
   - Monitor vector performance metrics

2. **Backup Considerations**:
   - Include PgVector extension in backups
   - Vector embeddings require significant storage
   - Consider incremental backups for large deployments

3. **Scaling Considerations**:
   - Vector operations are CPU/memory intensive
   - Consider read replicas for search operations
   - Monitor embedding dimensions vs performance trade-offs