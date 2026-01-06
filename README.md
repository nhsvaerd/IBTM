# IBTM — "I'll be there man"
### Or "Invite-Based Togethernes Management", if you're not into the whole brevity thing

This is a 'baby's first React app' learning project, with some aspirations of eventually becoming somewhat useful:

A self-hosted personal event, RSVP, and messageboard application built for low-friction guest participation.

Guests do not create accounts, but authenticate per-event using invite codes:
The goal is to enable simple access without registration, while retaining a modicum of access control.

## Core concepts

### Events

**An event is the central unit of organization. It defines:**

- Public vs private visibility
- Start / end time
- Optional capacity limits
- Read / write access windows
- Optional event attributes and questions (E.g facilities, meal preferences)
- Ownership and hosting priveleges

Events may be:
- **Public:** Browsable and self-registerable
- **Private:** Accessible only via invite code or existing authentication


### Registrants (event-scoped identities)
A registrant represents a single participant within one specific event.

- A registrant always belongs to exactly one event
- Registrants are implemented as a PocketBase auth collection
- Authentication uses:
    - `invite_id` as primary identity
    - a generated password
- Registrants are not global users and do not persist across events


### Invite codes
An invite code is a short-lived bearer secret used to authenticate a registrant.

- Format: `invite_id.password`
- Returned once, at creation time
- Not stored in plaintext in the database
- Used to authenticate via PocketBase’s built-in auth mechanism
- A registrant can be issued a new invite code by rotating the password component

Forwarding an invite code forwards access.


### Users
- A user is an optional authenticated account intended to relate multiple registrants across events.
- Not required for hosting or participation
- Intended for future convenience and administration (v2+)


## Roles and privileges

### Owning host
Each event has one owning host (registrant).

Only the owning host can:

- Assign host privileges (is_host=true)
- Cancel the event
- Set read_until / write_until access windows

## Co-hosts
Can:
- Add/invite registrants to private events they are co-hosting
- Increase event capacity
- Revoke access


## Access model (v1)

### Authentication
- Uses PocketBase’s built-in auth tokens for the `registrants auth collection

### Access paths
- First-time access: Invite link containing invite code
- Returning access: Direct access to /event/{eventId} if already authenticated

### Time-based access
Events may define:
- `write_until`: After which registrants become read-only. Default value offset from `end_time`
- `read_until`: (Optional) After which the event becomes inaccessible (archived)

### Roles
- Owning Host – the single registrant set as `events.owning_host`
- Co-host – registrant with `is_host = true`
- Guest – regular registrant
- Public – unauthenticated visitor

### Permissions
| Action                        | Public                 | Guest            | Co-host  | Owning Host   |
| ----------------------------- | ---------------------- | ---------------- | -------- | ------------- |
| Browse public events          | ✅                     | ✅              | ✅       | ✅           |
| View private event            | ❌                     | ✅              | ✅       | ✅           |
| View event details            | ⚠️ Public fields only  | ✅              | ✅       | ✅           |
| Self-register (public event)  | ✅                     | —               | —         | —            |
| Register via invite           | —                      | ✅              | ✅       | ✅           |
| Invite registrants            | ❌                     | ❌              | ✅       | ✅           |
| Assign host privileges        | ❌                     | ❌              | ❌       | ✅           |
| Create event                  | ✅                     | —               | —         | —            |
| Edit basic event details      | ❌                     | ❌              | ❌       | ✅           |
| Increase max capacity         | ❌                     | ❌              | ✅       | ✅           |
| Reduce max capacity           | ❌                     | ❌              | ❌       | ✅           |
| Cancel event                  | ❌                     | ❌              | ❌       | ✅           |
| Set read/write windows        | ❌                     | ❌              | ❌       | ✅           |
| Post messages (write window)  | ❌                     | ✅              | ✅       | ✅           |
| Read messages (read window)   | ❌                     | ✅              | ✅       | ✅           |
| Upload images                 | ❌                     | ✅              | ✅       | ✅           |
| Respond to questions          | ❌                     | ✅              | ✅       | ✅           |
| Check in registrants          | ❌                     | ❌              | ❌       | ✅           |


## Public browsing
Public events are exposed via a dedicated read-only view collection.
- Only public-safe fields are exposed
- Private events are not listed
- Browsed with dedicated frontend page

## Architecture
- Backend: PocketBase
- Frontend: React SPA

Custom endpoints (v1):

- `POST /api/event/create` (Public)
- `POST /api/event/:eventId/register` (Public and authenticated mode) 
- `POST /api/event/:eventId/registrant/:registrantId/invite-reissue` (Authenticated, host)
- `POST /api/event/:eventId/invite-reissue` (Public. Require `registrant_email`)

All other interactions rely on PocketBase’s standard API + rules.

This project is designed for small personal deployments.
Minimal friction is prioritized over strong security and identity guarantees.

## Non-goals (v1)
- Public user signup
- Device/session dashboards
- Advanced moderation tooling

## Tentati
- HTTP only Cookies and session abstraction
- Session controls
- Granulated response logging 
- Enhanced moderation and revocation controls