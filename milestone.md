> $ means it is identified by public key.

## Account Manager
Contains:
 - All personal accounts, separted by folder
Features:
 - Choose active account
 - Create a new account
 - Delete accounts from device

## General-Purpose Data Registry
Contains:
 - Tracker List [n]
 - Account list [$]
 - Peer list [$,n]
 - Post list [$,n]
 - Post timeline [n]
Features:
 - Creating & Updating data
 - Querying data
 - Removing data

## Networking (incoming & outgoing)
Receive & send requests [$]:
 - Configure
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
 - Download 
    - Account (+follow)
    - Peer list
    - Post [n]
 - Interact [post]
    - Comment
    - Post & Share
       - with tag [$]
    - Like

## Rendering (HTTP server)

## Tracker 
Contains [$]:
 - Peer list
Features:
 - Check client alive
Receive requests [$]:
 - Download [random1/all]
    - Peer list