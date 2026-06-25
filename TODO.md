# TODO

Use this file to collect future work items.

- [x] Set up the app as an installable PWA with a manifest, icons, service
      worker, and practical offline fallback behavior.
- [x] Apply the MATCHDAY design system from `DESIGN.md` across the app.
- [ ] Configure a production SMTP provider for Supabase Auth emails, keeping
      credentials in environment variables and verifying delivery.
- [x] Add web push notifications, including permission handling, subscription
      storage, notification delivery, and user controls for opting in or out.
- [x] Refresh the Portuguese translations and product voice.
- [x] Configure installed Android PWAs to open shared in-scope links.
- [x] Add native sharing support for games.
- it might be good to have some footage of games in the banner
- [x] Fix scrolling behind open modals.
- [x] Replace the avatar zoom slider with direct gestures.
- we need to support reseting password
- Add the possibility for the admin to add a user to a game by a search that lists out posible players 
- [x] Add google calendar support, where a player can add the game to his calendar 
- Right now there is no support for an admin to edit and already existing game and or series of games 
- Remove the temporary admin test push button once push notifications are verified. Also remove the related `sendPushTest` server action and all-users test push helper so admins can no longer broadcast test notifications to every subscribed device.
- Add the option for players to add proof of payment when joining a game, it should open a modal where the file can be added, it doesn't need to be mandatory the modal can have an add later button. when users haven't added proof of payment the admin should have the possibility of requesting proof of payment this should trigger an email and a push notification for the user, we also need to make sure that those files don't bloat supabase so they should be deleted after two weeks of the game conclusion 