> $ means it is identified by public key.

# Peer

## Auto-start
 - [ ] Send seeding to all trackers
 - [ ] Leeching following accounts

## Data Registry
Contains:
 - [x] Account [$]
 - [x] Posts [$,n] [timeline,n]
 - [x] Trackers [ip:port]

## Networking
 - Request (without [$])
    - [x] Accounts
    - [ ] Like
    - [x] Media
    - [x] Post
 - Receive
    - [x] Account (+follow)
    - [x] Like
    - [ ] Media
    - [x] Post
       - [ ] request media, if post has
       - [ ] tag categorize
       - [ ] timeline categorize

## User Interface (HTTP server)
 - Account
    - [x] Choose active account
    - [x] Create a new account
    - [ ] Delete accounts from device
 - Following
    - [ ] Add followers
    - [x] List followers
    - [ ] Remove followers\
 - Post
    - [x] Create a post
       - [ ] with media
       - [ ] with tag
    - [ ] Download mentioned post
    - [ ] Like a post
    - [x] Render post
       - [x] with mentions
       - [ ] send mention in post

# Tracker 
Contains:
 - [x] Account seeders [$]
 - [x] Active peers [ip:port]
Receive requests:
 - [x] Announcement [ip:port]
 - [x] Leeching (get seeding peers) [$]
 - [x] Seeding/Unseeding [$]