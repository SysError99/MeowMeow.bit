const Peer = require('./peer')

const PeerTracker = class extends Peer {
    /** List of seeding accounts */
    seeds = {}
}

module.exports = PeerTracker