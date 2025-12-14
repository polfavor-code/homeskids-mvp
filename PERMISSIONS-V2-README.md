# Homes.kids V2: Child-Centric Permissions Model

This document explains the new child-partitioned permission system for multi-home, multi-child co-parenting with blended families.

## Core Concepts

### Why Child Partitioning?

The previous family-based model assumed all family members could see all children. This doesn't work for blended families where:

- **Daddy** sees **June** but not **Elodie** (Mommy's child with Patrick)
- **Patrick** sees both **June** (stepchild) and **Elodie** (biological child)
- **A nanny** might only have access to one child, not the whole "family"

Child partitioning means **each user's access is explicitly defined per child**. No assumptions, no leaks.

### Terminology

| Term | Definition |
|------|------------|
| **Child** | A child record - the central entity for permissions |
| **Home** | A physical location where children can stay |
| **Guardian** | Parent or stepparent - highest permission tier for a child |
| **Helper** | Family member, friend, or nanny - lower permission tier |
| **ChildSpace** | The combination of (child_id + home_id) - where child-specific home data lives |

## Data Model Overview

```
profiles (auth users)
    │
    ├── child_guardians ────────► children_v2
    │       (parent/stepparent)        │
    │                                  │
    ├── child_access ──────────────────┤ (who can access this child)
    │       │                          │
    │       └── child_permission_overrides (fine-grained toggles)
    │
    ├── home_memberships ──────► homes_v2
    │       (home admin/member)        │
    │                                  │
    └── child_space_access ────► child_spaces ◄─── children_v2
            (per-home access)          │              + homes_v2
                                       │
                                       ├── items_v2
                                       └── child_space_contacts
```

## Guardians vs Helpers

### Guardians (Parent/Stepparent)

- Automatically get `access_level='manage'` for the child
- Can see ALL homes where the child has a `child_space`
- Full permissions: edit calendar, items, upload photos, add notes, manage helpers
- Can invite/remove helpers and adjust their permissions

```sql
-- Creating a guardian automatically sets up full permissions via trigger
INSERT INTO child_guardians (child_id, user_id, guardian_role)
VALUES ('child-uuid', 'user-uuid', 'parent');
```

### Helpers (Family Member/Friend/Nanny)

- Get permissions based on presets, adjustable by guardians
- Need EXPLICIT `child_space_access` rows to see specific homes
- Cannot see homes they don't have access to, even if the child stays there

| Helper Type | Access Level | Can Edit Items | Can Upload Photos | Can View Contacts |
|-------------|--------------|----------------|-------------------|-------------------|
| nanny | contribute | Yes | Yes | Yes |
| family_member | view | No | No | Yes |
| friend | view | No | No | No |

```sql
-- Adding a helper with preset
SELECT apply_helper_preset('child-uuid', 'user-uuid', 'nanny');

-- Grant access to specific homes
SELECT grant_child_space_access('child-space-uuid', 'user-uuid');
```

## Permission Overrides

Guardians can fine-tune any user's permissions beyond the presets:

```sql
UPDATE child_permission_overrides
SET can_upload_photos = TRUE,
    can_add_notes = TRUE
WHERE child_id = 'child-uuid'
AND user_id = 'helper-uuid';
```

Available toggles:
- `can_view_calendar` / `can_edit_calendar`
- `can_view_items` / `can_edit_items`
- `can_upload_photos`
- `can_add_notes`
- `can_view_contacts`
- `can_manage_helpers`

## Contact Privacy

The `child_space_contacts` table stores "responsible adults" per ChildSpace. Contact fields are only shown if the corresponding `share_*` flag is true:

```sql
-- Patrick shares his WhatsApp for June at PatrickHome
INSERT INTO child_space_contacts (child_space_id, user_id, share_phone, share_email, share_whatsapp, note)
VALUES ('child-space-uuid', 'patrick-uuid', TRUE, TRUE, TRUE, 'Usually home evenings');
```

**Client-side enforcement**: When displaying contacts, check `share_*` flags before showing fields:

```typescript
// Example client code
const displayPhone = contact.share_phone ? contact.user.phone : null;
const displayEmail = contact.share_email ? contact.user.email : null;
```

## How to Add a Second Child

Example: Adding Elodie to the system where Mommy and Patrick are guardians.

```sql
-- 1. Create the child
INSERT INTO children_v2 (name, dob, created_by)
VALUES ('Elodie', '2020-03-22', 'mommy-uuid')
RETURNING id; -- Store as 'elodie-uuid'

-- 2. Add guardians (triggers auto-setup permissions)
INSERT INTO child_guardians (child_id, user_id, guardian_role) VALUES
    ('elodie-uuid', 'mommy-uuid', 'parent'),
    ('elodie-uuid', 'patrick-uuid', 'parent');

-- 3. Create child_spaces linking Elodie to homes
INSERT INTO child_spaces (home_id, child_id) VALUES
    ('mommy-home-uuid', 'elodie-uuid'),
    ('patrick-home-uuid', 'elodie-uuid');
-- Note: NO DaddyHome because Daddy shouldn't see Elodie

-- 4. Add responsible adult contacts per home
INSERT INTO child_space_contacts (child_space_id, user_id, share_phone, share_email) VALUES
    ((SELECT id FROM child_spaces WHERE home_id = 'mommy-home-uuid' AND child_id = 'elodie-uuid'),
     'mommy-uuid', TRUE, TRUE),
    ((SELECT id FROM child_spaces WHERE home_id = 'patrick-home-uuid' AND child_id = 'elodie-uuid'),
     'patrick-uuid', TRUE, TRUE);
```

## How to Link a Child to Multiple Homes

```sql
-- June stays at three homes
INSERT INTO child_spaces (home_id, child_id) VALUES
    ('daddy-home-uuid', 'june-uuid'),
    ('mommy-home-uuid', 'june-uuid'),
    ('patrick-home-uuid', 'june-uuid');

-- All guardians automatically see all three child_spaces
-- Helpers need explicit child_space_access rows
```

## Key RLS Functions

These helper functions power the RLS policies:

| Function | Purpose |
|----------|---------|
| `is_guardian(child_id, user_id)` | Is user a guardian of this child? |
| `has_child_access(child_id, user_id)` | Does user have any access to this child? |
| `has_child_capability(child_id, user_id, capability)` | Does user have specific capability? |
| `can_access_child_space(child_space_id, user_id, level)` | Can user access child_space at required level? |
| `can_manage_helpers(child_id, user_id)` | Can user invite/manage helpers? |
| `can_see_home(home_id, user_id)` | Can user see this home? |

## Migration Files

Run these in order:

1. `supabase-v2-migration-001-tables.sql` - Creates all tables
2. `supabase-v2-migration-002-functions.sql` - Creates helper functions
3. `supabase-v2-migration-003-rls.sql` - Creates RLS policies
4. `supabase-v2-migration-004-seed.sql` - Creates test data (dev only)

## Test Scenarios (from seed data)

After running the seed script:

| User | Can See June? | Can See Elodie? | Can See June at PatrickHome? |
|------|---------------|-----------------|------------------------------|
| Daddy | Yes (guardian) | No | Yes |
| Mommy | Yes (guardian) | Yes (guardian) | Yes |
| Patrick | Yes (stepparent) | Yes (guardian) | Yes |
| Nanny Sarah | Yes (helper) | No | Yes (has child_space_access) |
| Grandma | Yes (helper) | Yes (helper) | No (only MommyHome access) |

## Common Queries

### Get all children a user can see

```sql
SELECT c.*
FROM children_v2 c
WHERE has_child_access(c.id, auth.uid());
```

### Get all items for a child across all homes (as guardian)

```sql
SELECT i.*, h.name as home_name
FROM items_v2 i
JOIN child_spaces cs ON cs.id = i.child_space_id
JOIN homes_v2 h ON h.id = cs.home_id
WHERE cs.child_id = 'child-uuid';
-- RLS automatically filters to homes user can access
```

### Get responsible adults for a child at a specific home

```sql
SELECT p.full_name,
       CASE WHEN csc.share_phone THEN p.phone END as phone,
       CASE WHEN csc.share_email THEN p.email END as email,
       CASE WHEN csc.share_whatsapp THEN p.whatsapp END as whatsapp,
       CASE WHEN csc.share_note THEN csc.note END as note
FROM child_space_contacts csc
JOIN profiles p ON p.id = csc.user_id
WHERE csc.child_space_id = 'child-space-uuid'
AND csc.is_active = TRUE;
```

## Future Considerations

- **Travel bags**: Items can move between child_spaces when child travels
- **Shared siblings**: If June and Elodie travel together, that's a future feature
- **Audit logging**: Track who changed permissions when
- **Invitations**: Email/SMS invites to join as helper
