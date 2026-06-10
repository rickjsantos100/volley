# Volleyball Game Management - Software Requirements

## 1. Purpose

Build an application for managing volleyball game events at a rental venue. The application should let users see upcoming games and add themselves to available events, while admins manage the game schedule, participant lists, payment status, and waitlists.

## 2. Account Types

### Admin

Admins manage the game calendar and participation.

Required capabilities:

- Create new game events.
- Edit existing game events.
- Cancel game events while keeping them visible to users.
- Delete game events when they should be removed from the schedule.
- Add users to a game event.
- Remove users from a game event.
- View all game details, including participants and capacity.
- View and update each participant's payment status.
- View and manage the waitlist for each game.
- Remove users from a waitlist.
- Reorder users in a waitlist.

### User

Users participate in scheduled games.

Required capabilities:

- View upcoming scheduled and cancelled game events.
- View game details, including date, duration, capacity, and joined users.
- Join a game when capacity is available.
- Join a waitlist when a game is full.
- Remove themselves from the participant list for a game they have joined.
- Leave a waitlist they have joined.

## 3. Game Event Requirements

Each game event must include:

- Title or name for the game.
- Date and start time.
- End time, with duration derived from the start and end times.
- Maximum number of participants.
- Current participant list.
- Waitlist.
- Repeat setting indicating whether the game repeats.
- Event status, such as scheduled, full, cancelled, or completed.

For repeatable events, the initial version should capture:

- Whether the event repeats.
- The repeat frequency, such as weekly.
- Optional repeat end date.

## 4. Core Functional Requirements

### Upcoming Games

The application must show upcoming volleyball games in chronological order.

Each listed game should show:

- Date and start time.
- Duration derived from the configured start and end times.
- Number of joined participants.
- Maximum participant capacity.
- Whether the game is full.
- Whether the game repeats.
- Whether the game is cancelled.

Cancelled games must remain visible in the upcoming games list when their start time is still in the future. They must be visually disabled, show a clear cancelled badge, and not allow users to join the game or waitlist.

### Game Details

Users and admins must be able to open a game event and see:

- Full event date and duration.
- Maximum participant count.
- List of users already joined.
- Remaining available spots.
- The current user's own payment status when they are on the participant list.
- Waitlist status, including whether the current user is on the waitlist.
- Repeat information.

Admins must also be able to see:

- Payment status for every participant.
- Full waitlist order.

### Joining Rules

- A user can join a game only if the game has available capacity.
- A user should not be able to join the same game more than once.
- A user can add themselves to a game's participant list without admin intervention when capacity is available.
- A user can remove themselves from the participant list for a game they have joined.
- A user can join the waitlist when the game has no available capacity.
- A user should not be able to join the participant list and the waitlist for the same game at the same time.
- A user should not be able to join the same waitlist more than once.
- A user should not be able to join cancelled or completed games.
- Admins can add or remove users from a game.
- Admins can remove users from a waitlist.
- Admins can reorder active waitlist users.
- When a participant leaves or is removed and a spot becomes available, the first waiting user on the waitlist should automatically move to the participant list.
- Automatic waitlist promotion should preserve waitlist order.
- Automatic waitlist promotion should use the current admin-managed waitlist order.

### Payment Status

- Each participant should have a payment status for the game.
- Payment status should indicate whether the participant has paid.
- Users should be able to see their own payment status for games where they are on the participant list.
- Users should not be able to see payment status for other users.
- Admins should be able to see payment status for every participant.
- Admins should be able to update payment status after confirming payment outside the application.

### Admin Event Management

Admins must be able to:

- Create a game with date, start time, end time, capacity, and repeat settings.
- Edit a game's date, start time, end time, capacity, and repeat settings.
- Cancel a game without hiding it from users.
- Delete a game from the schedule.
- Add users to a game participant list.
- Remove users from a game participant list.
- Mark participants as paid or unpaid.
- View the waitlist for a game.
- Remove users from the waitlist.
- Reorder users on the waitlist.

## 5. Initial Data Model

### User

- `id`
- `name`
- `email`
- `account_type`: `admin` or `user`
- `created_at`

### Game Event

- `id`
- `title`
- `starts_at`
- `duration_minutes`, derived from the configured start and end times
- `max_participants`
- `is_repeatable`
- `repeat_frequency`
- `repeat_ends_at`
- `status`
- `created_by`
- `created_at`
- `updated_at`

### Game Participant

- `id`
- `game_event_id`
- `user_id`
- `joined_at`
- `added_by`
- `source`: `self_joined`, `admin_added`, or `waitlist_promoted`
- `payment_status`: `unpaid` or `paid`
- `payment_updated_by`
- `payment_updated_at`

### Game Waitlist Entry

- `id`
- `game_event_id`
- `user_id`
- `joined_waitlist_at`
- `position`
- `status`: `waiting`, `promoted`, or `removed`

## 6. Non-Functional Requirements

- The application should be usable on desktop and mobile devices.
- Users must authenticate before joining or leaving games.
- Admin-only actions must be protected from normal users.
- Event capacity rules must be enforced server-side.
- Waitlist promotion must be handled server-side when participant spots become available.
- Payment status visibility must be enforced server-side so users can only see their own payment status.
- The interface should make upcoming games easy to scan.
- The system should prevent accidental duplicate participants.
- The system should prevent accidental duplicate waitlist entries.

## 7. Initial Screens

- Login or sign-up screen.
- Upcoming games list.
- Game details screen.
- Admin game creation form.
- Admin game editing form.
- Admin participant management view.
- Admin payment management view.
- Game waitlist view.

## 8. Acceptance Criteria

- A user can log in and see upcoming games.
- A user can view the participant list for a game.
- A user can join a game that is not full.
- A user cannot join the participant list for a full game.
- A user can join the waitlist for a full game.
- A user cannot join the same game twice.
- A user cannot join the same waitlist twice.
- A user cannot be both a participant and waitlisted for the same game.
- A user can remove themselves from the participant list for a game they joined.
- A user can leave a waitlist they joined.
- When a participant leaves a full game, the first waiting user is automatically promoted from the waitlist to the participant list.
- Automatically promoted users are removed from the active waitlist.
- An admin can create a game.
- An admin can edit a game.
- An admin can cancel or delete a game.
- A cancelled upcoming game remains visible to users.
- A cancelled game is visually disabled and shows a cancelled badge.
- A user cannot join or waitlist for a cancelled game.
- An admin can add a user to a game.
- An admin can remove a user from a game.
- An admin can see whether participants have paid.
- A user can see their own payment status for a game they are participating in.
- A normal user cannot see another user's payment status.
- An admin can mark a participant as paid or unpaid.
- An admin can see the waitlist for a full game.
- An admin can remove a user from the waitlist.
- An admin can reorder users in the waitlist.
- Upcoming games are ordered by date and time.

## 9. Open Questions

- Should users be able to create their own accounts, or should admins invite them?
- Should repeatable events create all future game records immediately or generate them on demand?
- Should users receive notifications when they join, leave, or are added to a game?
- Should payment collection happen inside the application in a future version, or should the app only track externally confirmed payments?
- Should waitlisted users have their own payment status, or only participants?
