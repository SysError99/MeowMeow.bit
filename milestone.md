> $ means it is identified by public key.

# Peer

## Account Manager
Features:
 - Choose active account
 - Create a new account
 - Delete accounts from device

## Data Registry
Contains:
 - Account [$]
 - Account database [tag]
 - Account seeders [$] [n]
 - Posts [$,tag,n] [n] (tag: by tag, n: by timeline)
 - Trackers [n]
Features:
 - Creating & Updating data
 - Querying data
 - Removing data

## Networking (incoming & outgoing)
Receive & send requests [$] [signature]:
 - Configure
    - Set account name
    - Manage followers
    - Manage following
    - Rename the account
    - Change cover picture
    - Change profile picture
    - Manage account tags
 - Download 
    - Account (+follow)
    - Peer list
    - Post [n]
 - Interact [post]
    - Comment
    - Like
    - Post & Share
       - with tag [$]

## Rendering (HTTP server)

# Announcer
Contains: Announcement [ip:port]
Receive requests: 
 - Announcement [ip:port]
 - Connected port

# Tracker 
Contains: Account seeders [$]: Peer[]
Receive requests: Account seeders [$]