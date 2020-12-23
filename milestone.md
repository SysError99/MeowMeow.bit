## Account Manager

Contains:
 - All personal accounts, separted by folder

Features:
 - Choose active account
 - Configure account
    - Set account name
    - Manage followers
    - Manage following
    - Rename the account
    - Change cover picture
    - Change profile picture
    - Change account visibility
        - Annouce account to trackers
        - Delete account from trackers
    - Manage account tags
- Creating new accounts
- Delete accounts from device

## General Purpose Registry

Contains:
 - Tracker List
 - (Indexed by account's public key)
    - Account list
    - Peer list
    - Post list
        - By account
        - By timeline

Features:
 - Querying data, using public key
    - `Peer` also choose by order, or randomize
    - `Post` also choose between from account, or timeline, and use post order
 - Updating data, using public key

## Networking (incoming)

## Networking (outgoing)

## Rendering (HTTP server)